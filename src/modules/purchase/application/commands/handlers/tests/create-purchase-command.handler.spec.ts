import { Err } from 'oxide.ts'
import { beforeEach, describe, expect, it } from 'vitest'

import { FakePurchaseUnitOfWork } from '@/libs/fake/fake-purchase-unit-of-work'
import { CreatePurchaseCommand } from '@/modules/purchase/application/commands/create-purchase.command'
import { CreatePurchaseCommandHandler } from '@/modules/purchase/application/commands/handlers/create-purchase-command.handler'
import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'

const IDEMPOTENCY_KEY = 'test-idem-key-1'
const BUYER_ID = 'buyer-1'
const PRODUCT_ID = 'product-1'

describe('CreatePurchaseCommandHandler', () => {
  let handler: CreatePurchaseCommandHandler
  let unitOfWork: FakePurchaseUnitOfWork

  beforeEach(() => {
    unitOfWork = new FakePurchaseUnitOfWork()
    handler = new CreatePurchaseCommandHandler(unitOfWork)
  })

  it('returns Ok with purchase result on success', async() => {
    const command = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)
    const result = await handler.execute(command)

    expect(result.isOk()).toBe(true)

    const purchase = result.unwrap()
    expect(purchase.buyerId).toBe(BUYER_ID)
    expect(purchase.productId).toBe(PRODUCT_ID)
  })

  it('returns existing purchase on repeated idempotency key', async() => {
    const command = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)

    const firstResult = await handler.execute(command)
    expect(firstResult.isOk()).toBe(true)

    const secondResult = await handler.execute(command)
    expect(secondResult.isOk()).toBe(true)
    expect(secondResult.unwrap().id).toBe(firstResult.unwrap().id)
  })

  it('returns Err when product is not available', async() => {
    unitOfWork.setNextResult(Err(new ProductNotAvailableError(PRODUCT_ID)))

    const command = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)
    const result = await handler.execute(command)

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr()).toBeInstanceOf(ProductNotAvailableError)
  })

  it('returns Err when buyer has insufficient funds', async() => {
    unitOfWork.setNextResult(Err(new InsufficientFundsError(BUYER_ID)))

    const command = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)
    const result = await handler.execute(command)

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr()).toBeInstanceOf(InsufficientFundsError)
  })

  it('returns Ok from idempotency cache even after error on second attempt', async() => {
    const successCommand = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)
    await handler.execute(successCommand)

    unitOfWork.setNextResult(Err(new ProductNotAvailableError(PRODUCT_ID)))

    const repeatCommand = new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID)
    const result = await handler.execute(repeatCommand)

    expect(result.isOk()).toBe(true)
  })

  it('returns Err when idempotency key is reused with a different request', async() => {
    await handler.execute(new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, PRODUCT_ID))

    const result = await handler.execute(
      new CreatePurchaseCommand(BUYER_ID, IDEMPOTENCY_KEY, 'product-2'),
    )

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr()).toBeInstanceOf(IdempotencyKeyConflictError)
  })
})
