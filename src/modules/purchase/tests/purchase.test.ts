import path from 'node:path'

import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, type TestingModule } from '@nestjs/testing'
import { getPort } from 'get-port-please'
import { ZodValidationPipe } from 'nestjs-zod'
import { Client } from 'pg'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { DataSource } from 'typeorm'

import { CreatePurchaseCommand } from '@/modules/purchase/application/commands/create-purchase.command'
import { CreatePurchaseCommandHandler } from '@/modules/purchase/application/commands/handlers/create-purchase-command.handler'
import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'
import { ProductStatus } from '@/modules/purchase/domain/product'
import { ProductEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/product.entity'
import { PurchaseEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/purchase.entity'
import { UserEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/user.entity'
import { WebModule } from '@/platform/bootstrap/web/web.module'
import { DbConfig } from '@/platform/database/configs/db.config'
import { DbEnv } from '@/platform/database/configs/envs/db.env'

const PG_NAME = 'db'
const SELLER_BALANCE = BigInt(0)
const BUYER_BALANCE = BigInt(50_000)
const PRODUCT_PRICE = BigInt(10_000)

async function createSchema(host: string, port: number): Promise<void> {
  const client = new Client({
    database: PG_NAME,
    host,
    password: PG_NAME,
    port,
    user: PG_NAME,
  })
  await client.connect()
  await client.query('CREATE SCHEMA IF NOT EXISTS main')
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  await client.end()
}

async function runMigrations(envs: NodeJS.ProcessEnv): Promise<void> {
  const dbConfig = new DbConfig(DbEnv.schema.parse(envs))
  const ds = new DataSource({
    ...dbConfig.createDataSourceOptions(),
    entities: [path.resolve('./src/modules/**/typeorm/entities/**/*.entity.{ts,js}')],
    logging: false,
    migrations: [path.resolve('./src/modules/**/typeorm/migrations/*{.ts,.js}')],
    migrationsRun: false,
    synchronize: false,
  })
  await ds.initialize()
  await ds.runMigrations()
  await ds.destroy()
}

async function seedUser(ds: DataSource, balance: bigint): Promise<string> {
  const repo = ds.getRepository(UserEntity)
  const user = repo.create({ balance: balance.toString() })
  const saved = await repo.save(user)

  return saved.id
}

async function seedProduct(ds: DataSource, sellerId: string, price: bigint): Promise<string> {
  const repo = ds.getRepository(ProductEntity)
  const product = repo.create({
    price: price.toString(),
    sellerId,
    status: ProductStatus.Available,
  })
  const saved = await repo.save(product)

  return saved.id
}

describe('Purchase integration', () => {
  let app: NestFastifyApplication
  let moduleFixture: TestingModule
  let pgContainer: StartedTestContainer
  let rabbitContainer: StartedTestContainer
  let createPurchase: CreatePurchaseCommandHandler
  let dataSource: DataSource
  let envs: NodeJS.ProcessEnv

  beforeAll(async() => {
    pgContainer = await new GenericContainer('postgres:17.6-alpine3.22')
      .withEnvironment({
        POSTGRES_DB: PG_NAME,
        POSTGRES_PASSWORD: PG_NAME,
        POSTGRES_USER: PG_NAME,
      })
      .withExposedPorts(5432)
      .start()

    rabbitContainer = await new GenericContainer('rabbitmq:4.1.4-alpine')
      .withExposedPorts(5672)
      .start()

    envs = {
      DB_DATABASE: PG_NAME,
      DB_HOST: pgContainer.getHost(),
      DB_PASSWORD: PG_NAME,
      DB_PORT: pgContainer.getMappedPort(5432).toString(),
      DB_SSL: 'false',
      DB_USERNAME: PG_NAME,
      LOG_LEVEL: 'silent',
      PORT: String(await getPort()),
      RABBITMQ_HOST: rabbitContainer.getHost(),
      RABBITMQ_PASSWORD: 'guest',
      RABBITMQ_PORT: rabbitContainer.getMappedPort(5672).toString(),
      RABBITMQ_USERNAME: 'guest',
    }

    await createSchema(pgContainer.getHost(), pgContainer.getMappedPort(5432))
    await runMigrations(envs)

    moduleFixture = await Test.createTestingModule({
      imports: [WebModule.forRootAsync({ envs })],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ZodValidationPipe())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    createPurchase = app.get(CreatePurchaseCommandHandler)

    const dbConfig = new DbConfig(DbEnv.schema.parse(envs))
    dataSource = new DataSource({
      ...dbConfig.createDataSourceOptions(),
      entities: [path.resolve('./src/modules/**/typeorm/entities/**/*.entity.{ts,js}')],
      logging: false,
      synchronize: false,
    })
    await dataSource.initialize()
  }, 120_000)

  afterAll(async() => {
    const cleanupTasks = [
      getApplicationCleanupTask(),
      dataSource === undefined ? undefined : dataSource.destroy(),
      pgContainer === undefined ? undefined : pgContainer.stop(),
      rabbitContainer === undefined ? undefined : rabbitContainer.stop(),
    ].filter((task): task is Promise<unknown> => task !== undefined)

    await Promise.allSettled(cleanupTasks)
  })

  function getApplicationCleanupTask(): Promise<unknown> | undefined {
    if (app !== undefined) {
      return app.close()
    }

    if (moduleFixture !== undefined) {
      return moduleFixture.close()
    }

    return undefined
  }

  async function postPurchase(params: {
    buyerId?: string
    idempotencyKey?: string
    productId?: string
  }): Promise<{ body: unknown, statusCode: number }> {
    const response = await app.inject({
      headers: params.idempotencyKey === undefined ? {} : { 'idempotency-key': params.idempotencyKey },
      method: 'POST',
      payload: {
        buyerId: params.buyerId,
        productId: params.productId,
      },
      url: '/purchases',
    })

    return {
      body: response.json(),
      statusCode: response.statusCode,
    }
  }

  it('creates a purchase and transfers balance', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const result = await createPurchase.execute(
      new CreatePurchaseCommand(buyerId, 'idem-key-basic', productId),
    )

    expect(result.isOk()).toBe(true)

    const purchase = result.unwrap()
    expect(purchase.buyerId).toBe(buyerId)
    expect(purchase.productId).toBe(productId)
    expect(purchase.sellerId).toBe(sellerId)
    expect(purchase.amount).toBe(PRODUCT_PRICE)

    const purchaseRow = await dataSource
      .getRepository(PurchaseEntity)
      .findOne({ where: { id: purchase.id } })

    expect(purchaseRow).not.toBeNull()

    const product = await dataSource.getRepository(ProductEntity).findOne({ where: { id: productId } })
    expect(product?.status).toBe(ProductStatus.Sold)

    const buyer = await dataSource.getRepository(UserEntity).findOne({ where: { id: buyerId } })
    expect(BigInt(buyer?.balance ?? '0')).toBe(BUYER_BALANCE - PRODUCT_PRICE)

    const seller = await dataSource.getRepository(UserEntity).findOne({ where: { id: sellerId } })
    expect(BigInt(seller?.balance ?? '0')).toBe(SELLER_BALANCE + PRODUCT_PRICE)
  }, 30_000)

  it('creates a purchase through REST API', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const response = await postPurchase({
      buyerId,
      idempotencyKey: 'idem-key-rest-basic',
      productId,
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      amount: PRODUCT_PRICE.toString(),
      buyerId,
      productId,
      sellerId,
    })
  }, 30_000)

  it('returns 400 when idempotency key header is missing', async() => {
    const response = await postPurchase({
      buyerId: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(response.statusCode).toBe(400)
  }, 30_000)

  it('returns 400 when request body contains invalid UUIDs', async() => {
    const response = await postPurchase({
      buyerId: 'not-a-uuid',
      idempotencyKey: 'idem-key-rest-invalid-body',
      productId: 'also-not-a-uuid',
    })

    expect(response.statusCode).toBe(400)
  }, 30_000)

  it('is idempotent — repeated request returns same purchase', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)
    const idempotencyKey = 'idem-key-repeat'

    const first = await createPurchase.execute(new CreatePurchaseCommand(buyerId, idempotencyKey, productId))
    const second = await createPurchase.execute(new CreatePurchaseCommand(buyerId, idempotencyKey, productId))

    expect(first.isOk()).toBe(true)
    expect(second.isOk()).toBe(true)
    expect(second.unwrap().id).toBe(first.unwrap().id)

    const count = await dataSource
      .getRepository(PurchaseEntity)
      .countBy({ idempotencyKey })

    expect(count).toBe(1)
  }, 30_000)

  it('rejects idempotency key reuse with different request payload', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BUYER_BALANCE)
    const product1Id = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)
    const product2Id = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)
    const idempotencyKey = 'idem-key-payload-conflict'

    const first = await createPurchase.execute(new CreatePurchaseCommand(buyerId, idempotencyKey, product1Id))
    const second = await createPurchase.execute(new CreatePurchaseCommand(buyerId, idempotencyKey, product2Id))

    expect(first.isOk()).toBe(true)
    expect(second.isErr()).toBe(true)
    expect(second.unwrapErr()).toBeInstanceOf(IdempotencyKeyConflictError)

    const purchaseCount = await dataSource
      .getRepository(PurchaseEntity)
      .countBy({ idempotencyKey })

    expect(purchaseCount).toBe(1)
  }, 30_000)

  it('handles concurrent retries with same idempotency key', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)
    const idempotencyKey = 'idem-key-concurrent-repeat'

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        createPurchase.execute(new CreatePurchaseCommand(buyerId, idempotencyKey, productId)),
      ),
    )

    expect(results.every((result) => result.isOk())).toBe(true)
    expect(new Set(results.map((result) => result.unwrap().id)).size).toBe(1)

    const purchaseCount = await dataSource
      .getRepository(PurchaseEntity)
      .countBy({ idempotencyKey })

    expect(purchaseCount).toBe(1)
  }, 30_000)

  it('fails with ProductNotAvailableError when product is already sold', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyer1Id = await seedUser(dataSource, BUYER_BALANCE)
    const buyer2Id = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const first = await createPurchase.execute(new CreatePurchaseCommand(buyer1Id, 'idem-key-sold-1', productId))
    expect(first.isOk()).toBe(true)

    const second = await createPurchase.execute(new CreatePurchaseCommand(buyer2Id, 'idem-key-sold-2', productId))
    expect(second.isErr()).toBe(true)
    expect(second.unwrapErr()).toBeInstanceOf(ProductNotAvailableError)
  }, 30_000)

  it('returns 409 through REST API when product is already sold', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyer1Id = await seedUser(dataSource, BUYER_BALANCE)
    const buyer2Id = await seedUser(dataSource, BUYER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const first = await postPurchase({
      buyerId: buyer1Id,
      idempotencyKey: 'idem-key-rest-sold-1',
      productId,
    })
    const second = await postPurchase({
      buyerId: buyer2Id,
      idempotencyKey: 'idem-key-rest-sold-2',
      productId,
    })

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(409)
  }, 30_000)

  it('fails with InsufficientFundsError when balance is too low', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const poorBuyerId = await seedUser(dataSource, BigInt(100))
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const result = await createPurchase.execute(
      new CreatePurchaseCommand(poorBuyerId, 'idem-key-broke', productId),
    )

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr()).toBeInstanceOf(InsufficientFundsError)
  }, 30_000)

  it('returns 422 through REST API when buyer has insufficient funds', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BigInt(100))
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const response = await postPurchase({
      buyerId,
      idempotencyKey: 'idem-key-rest-insufficient-funds',
      productId,
    })

    expect(response.statusCode).toBe(422)
  }, 30_000)

  it('handles concurrent purchases of same product — only one succeeds', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const productId = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const buyerIds = await Promise.all(
      Array.from({ length: 5 }, () => seedUser(dataSource, BUYER_BALANCE)),
    )

    const results = await Promise.all(
      buyerIds.map((buyerId, idx) =>
        createPurchase.execute(new CreatePurchaseCommand(buyerId, `idem-key-race-${String(idx)}`, productId)),
      ),
    )

    const successes = results.filter((result) => result.isOk())
    const failures = results.filter((result) => result.isErr())

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(4)

    for (const failure of failures) {
      expect(failure.unwrapErr()).toBeInstanceOf(ProductNotAvailableError)
    }

    const purchaseCount = await dataSource.getRepository(PurchaseEntity).countBy({ productId })
    expect(purchaseCount).toBe(1)
  }, 30_000)

  it('handles concurrent purchases of different products by same buyer — only one succeeds', async() => {
    const sellerId = await seedUser(dataSource, SELLER_BALANCE)
    const buyerId = await seedUser(dataSource, BigInt(15_000))
    const product1Id = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)
    const product2Id = await seedProduct(dataSource, sellerId, PRODUCT_PRICE)

    const results = await Promise.all([
      createPurchase.execute(new CreatePurchaseCommand(buyerId, 'idem-buyer-race-1', product1Id)),
      createPurchase.execute(new CreatePurchaseCommand(buyerId, 'idem-buyer-race-2', product2Id)),
    ])

    const successes = results.filter((result) => result.isOk())
    const failures = results.filter((result) => result.isErr())

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)

    const failure = failures.at(0)
    expect(failure).toBeDefined()
    expect(failure?.unwrapErr()).toBeInstanceOf(InsufficientFundsError)

    const buyer = await dataSource.getRepository(UserEntity).findOne({ where: { id: buyerId } })
    expect(BigInt(buyer?.balance ?? '0')).toBe(BigInt(15_000) - PRODUCT_PRICE)
  }, 30_000)
})
