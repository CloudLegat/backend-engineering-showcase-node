import { ApiProperty } from '@nestjs/swagger'

import type { PurchaseResult } from '@/modules/purchase/application/dto/purchase-result.dto'

export class PurchaseResponseDto {
  @ApiProperty({ example: '10000' })
  public readonly amount: string

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  public readonly buyerId: string

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  public readonly id: string

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  public readonly productId: string

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  public readonly sellerId: string

  public constructor(result: PurchaseResult) {
    this.amount = result.amount.toString()
    this.buyerId = result.buyerId
    this.id = result.id
    this.productId = result.productId
    this.sellerId = result.sellerId
  }
}
