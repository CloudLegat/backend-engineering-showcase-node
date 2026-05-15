import type { Result } from 'oxide.ts'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'
import type { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import type { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import type { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'

export type PurchaseError = IdempotencyKeyConflictError | InsufficientFundsError | ProductNotAvailableError

export interface ExecutePurchaseParams {
  buyerId: string
  idempotencyKey: string
  productId: string
}

export const PURCHASE_UNIT_OF_WORK_PORT = Symbol('PURCHASE_UNIT_OF_WORK_PORT')

export interface PurchaseUnitOfWorkPort {
  execute(params: ExecutePurchaseParams): Promise<Result<PurchaseResult, PurchaseError>>
}
