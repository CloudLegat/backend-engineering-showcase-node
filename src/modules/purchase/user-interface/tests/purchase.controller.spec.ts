import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { type CommandBus } from '@nestjs/cqrs'
import { Err, Ok } from 'oxide.ts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'
import { PurchaseResponseDto } from '@/modules/purchase/user-interface/dto/purchase-response.dto'
import { PurchaseController } from '@/modules/purchase/user-interface/purchase.controller'

const PURCHASE_RESULT = {
  amount: BigInt(10_000),
  buyerId: 'buyer-id',
  id: 'purchase-id',
  productId: 'product-id',
  sellerId: 'seller-id',
}

const REQUEST_DTO = { buyerId: 'buyer-id', productId: 'product-id' }

describe('PurchaseController', () => {
  let controller: PurchaseController
  let commandBus: { execute: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    commandBus = { execute: vi.fn() }
    controller = new PurchaseController(commandBus as unknown as CommandBus)
  })

  it('throws BadRequestException when idempotency-key header is missing', async() => {
    await expect(controller.createPurchase(REQUEST_DTO, undefined)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('throws BadRequestException when idempotency-key header is empty string', async() => {
    await expect(controller.createPurchase(REQUEST_DTO, '')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('returns PurchaseResponseDto on success', async() => {
    commandBus.execute.mockResolvedValue(Ok(PURCHASE_RESULT))

    const result = await controller.createPurchase(REQUEST_DTO, 'idem-key')

    expect(result).toBeInstanceOf(PurchaseResponseDto)
    expect(result.amount).toBe(PURCHASE_RESULT.amount.toString())
    expect(result.buyerId).toBe(PURCHASE_RESULT.buyerId)
  })

  it('throws ConflictException for ProductNotAvailableError', async() => {
    commandBus.execute.mockResolvedValue(Err(new ProductNotAvailableError('product-id')))

    await expect(controller.createPurchase(REQUEST_DTO, 'idem-key')).rejects.toBeInstanceOf(ConflictException)
  })

  it('throws ConflictException for IdempotencyKeyConflictError', async() => {
    commandBus.execute.mockResolvedValue(Err(new IdempotencyKeyConflictError('idem-key')))

    await expect(controller.createPurchase(REQUEST_DTO, 'idem-key')).rejects.toBeInstanceOf(ConflictException)
  })

  it('throws UnprocessableEntityException for InsufficientFundsError', async() => {
    commandBus.execute.mockResolvedValue(Err(new InsufficientFundsError('buyer-id')))

    await expect(controller.createPurchase(REQUEST_DTO, 'idem-key')).rejects.toBeInstanceOf(UnprocessableEntityException)
  })
})
