export class CreatePurchaseCommand {
  public constructor(
    public readonly buyerId: string,
    public readonly idempotencyKey: string,
    public readonly productId: string,
  ) {}
}
