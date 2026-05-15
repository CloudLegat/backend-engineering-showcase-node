import { Err, Ok, type Result } from 'oxide.ts'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'
import type {
  ExecutePurchaseParams,
  PurchaseError,
  PurchaseUnitOfWorkPort,
} from '@/modules/purchase/application/ports/purchase-unit-of-work.port'

import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'

type StoredPurchase = { requestHash: string, result: PurchaseResult }

export class FakePurchaseUnitOfWork implements PurchaseUnitOfWorkPort {
  private readonly store = new Map<string, StoredPurchase>()

  private nextResult: Result<PurchaseResult, PurchaseError> = Ok({
    amount: BigInt(10000),
    buyerId: 'buyer-1',
    id: 'purchase-1',
    productId: 'product-1',
    sellerId: 'seller-1',
  })

  public execute(params: ExecutePurchaseParams): Promise<Result<PurchaseResult, PurchaseError>> {
    const existing = this.store.get(params.idempotencyKey)

    if (existing !== undefined) {
      if (existing.requestHash !== this.createRequestHash(params)) {
        return Promise.resolve(Err(new IdempotencyKeyConflictError(params.idempotencyKey)))
      }

      return Promise.resolve(Ok(existing.result))
    }

    if (this.nextResult.isOk()) {
      this.store.set(params.idempotencyKey, {
        requestHash: this.createRequestHash(params),
        result: this.nextResult.unwrap(),
      })
    }

    return Promise.resolve(this.nextResult)
  }

  public setNextResult(result: Result<PurchaseResult, PurchaseError>): void {
    this.nextResult = result
  }

  private createRequestHash(params: ExecutePurchaseParams): string {
    return JSON.stringify({ buyerId: params.buyerId, productId: params.productId })
  }
}
