export class InsufficientFundsError extends Error {
  public constructor(buyerId: string) {
    super(`Buyer ${buyerId} has insufficient funds`)
    this.name = 'InsufficientFundsError'
  }
}
