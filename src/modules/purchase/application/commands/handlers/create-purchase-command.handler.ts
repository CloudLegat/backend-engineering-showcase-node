import { Inject } from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { type Result } from 'oxide.ts'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'
import type {
  PurchaseError,
  PurchaseUnitOfWorkPort,
} from '@/modules/purchase/application/ports/purchase-unit-of-work.port'

import { CreatePurchaseCommand } from '@/modules/purchase/application/commands/create-purchase.command'
import { PURCHASE_UNIT_OF_WORK_PORT } from '@/modules/purchase/application/ports/purchase-unit-of-work.port'

@CommandHandler(CreatePurchaseCommand)
export class CreatePurchaseCommandHandler
  implements ICommandHandler<CreatePurchaseCommand, Result<PurchaseResult, PurchaseError>>
{
  public constructor(
    @Inject(PURCHASE_UNIT_OF_WORK_PORT)
    private readonly purchaseUnitOfWork: PurchaseUnitOfWorkPort,
  ) {}

  public async execute(command: CreatePurchaseCommand): Promise<Result<PurchaseResult, PurchaseError>> {
    return this.purchaseUnitOfWork.execute({
      buyerId: command.buyerId,
      idempotencyKey: command.idempotencyKey,
      productId: command.productId,
    })
  }
}
