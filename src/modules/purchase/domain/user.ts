import { InsufficientFundsError } from '@/modules/purchase/domain/errors/insufficient-funds.error'

export class User {
  private _balance: bigint

  public constructor(
    public readonly id: string,
    balance: bigint,
  ) {
    this._balance = balance
  }

  public get balance(): bigint {
    return this._balance
  }

  public canAfford(amount: bigint): boolean {
    return this._balance >= amount
  }

  public credit(amount: bigint): void {
    this._balance += amount
  }

  public debit(amount: bigint): void {
    if (!this.canAfford(amount)) {
      throw new InsufficientFundsError(this.id)
    }

    this._balance -= amount
  }
}
