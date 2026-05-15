export class IdempotencyKeyConflictError extends Error {
  public constructor(idempotencyKey: string) {
    super(`Idempotency key ${idempotencyKey} was already used with a different request`)
    this.name = 'IdempotencyKeyConflictError'
  }
}
