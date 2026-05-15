import { Column, Entity, Index } from 'typeorm'

import { AbstractEntity } from '@/libs/typeorm/abstract-entity'

@Entity('idempotency_keys')
@Index('idempotency_keys_idempotency_key_uk', ['idempotencyKey'], { unique: true })
export class IdempotencyKeyEntity extends AbstractEntity {
  @Column({ length: 255, name: 'idempotency_key', type: 'varchar' })
  public readonly idempotencyKey!: string

  @Column({ name: 'purchase_id', nullable: true, type: 'uuid' })
  public readonly purchaseId!: string | null

  @Column({ length: 64, name: 'request_hash', type: 'varchar' })
  public readonly requestHash!: string
}
