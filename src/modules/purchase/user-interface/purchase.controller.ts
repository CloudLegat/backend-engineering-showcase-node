import type { Result } from 'oxide.ts'

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'
import type { PurchaseError } from '@/modules/purchase/application/ports/purchase-unit-of-work.port'

import { CreatePurchaseCommand } from '@/modules/purchase/application/commands/create-purchase.command'
import { IdempotencyKeyConflictError } from '@/modules/purchase/application/errors/idempotency-key-conflict.error'
import { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'

import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto'
import { PurchaseResponseDto } from './dto/purchase-response.dto'

@ApiTags('purchases')
@Controller('purchases')
export class PurchaseController {
  public constructor(
    private readonly commandBus: CommandBus,
  ) {}

  @ApiHeader({ description: 'Idempotency key for deduplication', name: 'idempotency-key', required: true })
  @ApiOperation({ summary: 'Purchase a product' })
  @ApiResponse({
    description: 'Purchase created or idempotent result returned',
    status: 200,
    type: PurchaseResponseDto,
  })
  @ApiResponse({ description: 'Product is no longer available', status: 409 })
  @ApiResponse({ description: 'Buyer has insufficient funds', status: 422 })
  @HttpCode(HttpStatus.OK)
  @Post()
  public async createPurchase(
    @Body() dto: CreatePurchaseRequestDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<PurchaseResponseDto> {
    if (idempotencyKey === undefined || idempotencyKey === '') {
      throw new BadRequestException('idempotency-key header is required')
    }

    const result = await this.commandBus.execute<CreatePurchaseCommand, Result<PurchaseResult, PurchaseError>>(
      new CreatePurchaseCommand(dto.buyerId, idempotencyKey, dto.productId),
    )

    if (result.isErr()) {
      return this.mapError(result.unwrapErr())
    }

    return new PurchaseResponseDto(result.unwrap())
  }

  private mapError(err: PurchaseError): never {
    if (err instanceof ProductNotAvailableError) {
      throw new ConflictException(err.message)
    }

    if (err instanceof IdempotencyKeyConflictError) {
      throw new ConflictException(err.message)
    }

    if (err instanceof InsufficientFundsError) {
      throw new UnprocessableEntityException(err.message)
    }

    const _exhaustive: never = err
    throw new Error(`Unhandled PurchaseError variant: ${String(_exhaustive as unknown)}`)
  }
}
