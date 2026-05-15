import { createHash } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { Err, Ok, type Result } from 'oxide.ts'
import { DataSource, type QueryRunner } from 'typeorm'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'
import type { ExecutePurchaseParams, PurchaseError } from '@/modules/purchase/application/ports/purchase-unit-of-work.port'
import type { RabbitMQPublisherPort } from '@/platform/messaging/rabbitmq/rabbitmq-publisher.port'

import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import { InsufficientFundsError } from '@/modules/purchase/domain/errors/insufficient-funds.error'
import { ProductNotAvailableError } from '@/modules/purchase/domain/errors/product-not-available.error'
import { Product, ProductStatus } from '@/modules/purchase/domain/product'
import { User } from '@/modules/purchase/domain/user'
import { IdempotencyKeyEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/idempotency-key.entity'
import { OutboxEventEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/outbox-event.entity'
import { ProductEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/product.entity'
import { PurchaseEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/purchase.entity'
import { UserEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/user.entity'
import { DatabaseModule } from '@/platform/database/database.module'
import { RABBITMQ_PUBLISHER_PORT } from '@/platform/messaging/rabbitmq/rabbitmq-publisher.port'

const PURCHASE_QUEUE = 'purchase.completed'

type PersistResult = { outboxEventId: string, purchaseResult: PurchaseResult }

type IdempotencyKeyCtx = { idempotencyKey: string, requestHash: string }

type TransactionContext = {
  buyer: User
  params: ExecutePurchaseParams
  product: Product
  queryRunner: QueryRunner
  requestHash: string
  seller: User
}

function createRequestHash(params: ExecutePurchaseParams): string {
  return createHash('sha256')
    .update(JSON.stringify({ buyerId: params.buyerId, productId: params.productId }))
    .digest('hex')
}

@Injectable()
export class PurchaseUnitOfWorkAdapter {
  public constructor(
    @DatabaseModule.InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(RABBITMQ_PUBLISHER_PORT)
    private readonly rabbitMQPublisher: RabbitMQPublisherPort,
  ) {}

  public async execute(params: ExecutePurchaseParams): Promise<Result<PurchaseResult, PurchaseError>> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      return await this.executeInTransaction(params, queryRunner)
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  private async executeInTransaction(
    params: ExecutePurchaseParams,
    queryRunner: QueryRunner,
  ): Promise<Result<PurchaseResult, PurchaseError>> {
    const requestHash = createRequestHash(params)
    const idempotencyResult = await this.acquireIdempotencyKey({ idempotencyKey: params.idempotencyKey, requestHash }, queryRunner)

    if (idempotencyResult.isErr()) {
      await queryRunner.rollbackTransaction()

      return Err(idempotencyResult.unwrapErr())
    }

    const existingPurchase = idempotencyResult.unwrap()

    if (existingPurchase !== null) {
      await queryRunner.commitTransaction()

      return Ok(existingPurchase)
    }

    const runResult = await this.runTransaction(params, queryRunner)

    if (runResult.isErr()) {
      await queryRunner.rollbackTransaction()

      return Err(runResult.unwrapErr())
    }

    await queryRunner.commitTransaction()

    const { outboxEventId, purchaseResult } = runResult.unwrap()
    void this.tryDirectPublish(purchaseResult, outboxEventId)

    return Ok(purchaseResult)
  }

  private async acquireIdempotencyKey(
    ctx: IdempotencyKeyCtx,
    queryRunner: QueryRunner,
  ): Promise<Result<PurchaseResult | null, PurchaseError>> {
    const insertResult = await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKeyEntity)
      .values({ idempotencyKey: ctx.idempotencyKey, purchaseId: null, requestHash: ctx.requestHash })
      .orIgnore()
      .returning('id')
      .execute()

    if (Array.isArray(insertResult.raw) && insertResult.raw.length > 0) {
      return Ok(null)
    }

    return await this.resolveExistingIdempotencyKey(ctx, queryRunner)
  }

  private async resolveExistingIdempotencyKey(
    ctx: IdempotencyKeyCtx,
    queryRunner: QueryRunner,
  ): Promise<Result<PurchaseResult, PurchaseError>> {
    const existingKey = await queryRunner.manager.findOne(IdempotencyKeyEntity, {
      lock: { mode: 'pessimistic_write' },
      where: { idempotencyKey: ctx.idempotencyKey },
    })

    if (existingKey === null) {
      throw new Error(`Idempotency key ${ctx.idempotencyKey} was not found after conflict`)
    }

    if (existingKey.requestHash !== ctx.requestHash) {
      return Err(new IdempotencyKeyConflictError(ctx.idempotencyKey))
    }

    if (existingKey.purchaseId === null) {
      throw new Error(`Idempotency key ${ctx.idempotencyKey} has no completed purchase`)
    }

    const purchase = await queryRunner.manager.findOne(PurchaseEntity, {
      where: { id: existingKey.purchaseId },
    })

    if (purchase === null) {
      throw new Error(`Purchase ${existingKey.purchaseId} was not found for idempotency key`)
    }

    return Ok(this.toResult(purchase))
  }

  private async runTransaction(
    params: ExecutePurchaseParams,
    queryRunner: QueryRunner,
  ): Promise<Result<PersistResult, PurchaseError>> {
    const requestHash = createRequestHash(params)
    const product = await this.acquireProduct(params.productId, queryRunner)

    if (!product.isAvailable()) {
      return Err(new ProductNotAvailableError(params.productId))
    }

    const users = await this.acquireUsers([params.buyerId, product.sellerId], queryRunner)
    const buyer = users.get(params.buyerId)
    const seller = users.get(product.sellerId)

    if (buyer === undefined) {
      throw new Error(`Buyer ${params.buyerId} was not found`)
    }

    if (!buyer.canAfford(product.price)) {
      return Err(new InsufficientFundsError(params.buyerId))
    }

    if (seller === undefined) {
      throw new Error(`Seller ${product.sellerId} was not found`)
    }

    product.purchase()
    buyer.debit(product.price)
    seller.credit(product.price)

    return Ok(await this.persistPurchase({ buyer, params, product, queryRunner, requestHash, seller }))
  }

  private async acquireProduct(productId: string, queryRunner: QueryRunner): Promise<Product> {
    const entity = await queryRunner.manager.findOne(ProductEntity, {
      lock: { mode: 'pessimistic_write' },
      where: { id: productId },
    })

    if (entity === null) throw new Error(`Product ${productId} was not found`)

    return new Product(entity.id, BigInt(entity.price), entity.sellerId, entity.status)
  }

  private async acquireUser(userId: string, queryRunner: QueryRunner): Promise<User | null> {
    const entity = await queryRunner.manager.findOne(UserEntity, {
      lock: { mode: 'pessimistic_write' },
      where: { id: userId },
    })

    if (entity === null) return null

    return new User(entity.id, BigInt(entity.balance))
  }

  private async acquireUsers(userIds: string[], queryRunner: QueryRunner): Promise<Map<string, User>> {
    const users = new Map<string, User>()

    for (const userId of [...new Set(userIds)].sort()) {
      const user = await this.acquireUser(userId, queryRunner)

      if (user !== null) {
        users.set(userId, user)
      }
    }

    return users
  }

  private async persistPurchase(ctx: TransactionContext): Promise<PersistResult> {
    await ctx.queryRunner.manager.update(ProductEntity, { id: ctx.product.id }, { status: ProductStatus.Sold })
    await ctx.queryRunner.manager.update(UserEntity, { id: ctx.buyer.id }, { balance: ctx.buyer.balance.toString() })
    await ctx.queryRunner.manager.update(UserEntity, { id: ctx.seller.id }, { balance: ctx.seller.balance.toString() })

    const purchase = await ctx.queryRunner.manager.save(PurchaseEntity, {
      amount: ctx.product.price.toString(),
      buyerId: ctx.params.buyerId,
      idempotencyKey: ctx.params.idempotencyKey,
      productId: ctx.params.productId,
      requestHash: ctx.requestHash,
      sellerId: ctx.product.sellerId,
    })

    const outboxEvent = await ctx.queryRunner.manager.save(OutboxEventEntity, {
      eventType: 'purchase.completed',
      payload: {
        amount: ctx.product.price.toString(),
        buyerId: ctx.params.buyerId,
        productId: ctx.params.productId,
        purchaseId: purchase.id,
        sellerId: ctx.product.sellerId,
      },
      publishedAt: null,
      queueName: PURCHASE_QUEUE,
    })

    await ctx.queryRunner.manager.update(
      IdempotencyKeyEntity,
      { idempotencyKey: ctx.params.idempotencyKey },
      { purchaseId: purchase.id },
    )

    return { outboxEventId: outboxEvent.id, purchaseResult: this.toResult(purchase) }
  }

  private toResult(entity: PurchaseEntity): PurchaseResult {
    return {
      amount: BigInt(entity.amount),
      buyerId: entity.buyerId,
      id: entity.id,
      productId: entity.productId,
      sellerId: entity.sellerId,
    }
  }

  private tryDirectPublish(result: PurchaseResult, outboxEventId: string): Promise<void> {
    return this.rabbitMQPublisher
      .publishMessageToQueue({
        message: { ...result, amount: result.amount.toString() },
        queueName: PURCHASE_QUEUE,
      })
      .then(() => this.markPublished(outboxEventId))
      .catch(() => undefined)
  }

  private async markPublished(id: string): Promise<void> {
    await this.dataSource
      .getRepository(OutboxEventEntity)
      .update({ id }, { publishedAt: new Date() })
  }
}
