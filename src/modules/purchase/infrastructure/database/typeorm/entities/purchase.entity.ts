import { Column, Entity, Index } from 'typeorm'

import { AbstractEntity } from '@/libs/typeorm/abstract-entity'

@Entity('purchases')
@Index('purchases_idempotency_key_uk', ['idempotencyKey'], { unique: true })
export class PurchaseEntity extends AbstractEntity {
  @Column({ name: 'amount', type: 'bigint' })
  public readonly amount!: string

  @Column({ name: 'buyer_id', type: 'uuid' })
  public readonly buyerId!: string

  @Column({ length: 255, name: 'idempotency_key', type: 'varchar' })
  public readonly idempotencyKey!: string

  @Column({ name: 'product_id', type: 'uuid' })
  public readonly productId!: string

  @Column({ length: 64, name: 'request_hash', type: 'varchar' })
  public readonly requestHash!: string

  @Column({ name: 'seller_id', type: 'uuid' })
  public readonly sellerId!: string
}
