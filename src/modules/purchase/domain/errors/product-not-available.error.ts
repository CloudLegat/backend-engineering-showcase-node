export class ProductNotAvailableError extends Error {
  public constructor(productId: string) {
    super(`Product ${productId} is not available for purchase`)
    this.name = 'ProductNotAvailableError'
  }
}
