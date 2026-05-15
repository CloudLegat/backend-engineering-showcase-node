import { ProductNotAvailableError } from '@/modules/purchase/domain/errors/product-not-available.error'

export enum ProductStatus {
  Available = 'available',
  Sold = 'sold',
}

export class Product {
  private _status: ProductStatus

  public constructor(
    public readonly id: string,
    public readonly price: bigint,
    public readonly sellerId: string,
    status: ProductStatus,
  ) {
    this._status = status
  }

  public get status(): ProductStatus {
    return this._status
  }

  public isAvailable(): boolean {
    return this._status === ProductStatus.Available
  }

  public purchase(): void {
    if (!this.isAvailable()) {
      throw new ProductNotAvailableError(this.id)
    }

    this._status = ProductStatus.Sold
  }
}
