import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '@/libs/typeorm/abstract-entity'

@Entity('outbox_events')
export class OutboxEventEntity extends AbstractEntity {
  @Column({ length: 100, name: 'event_type', type: 'varchar' })
  public readonly eventType!: string

  @Column({ name: 'payload', type: 'jsonb' })
  public readonly payload!: object

  @Column({ name: 'published_at', nullable: true, type: 'timestamp without time zone' })
  public readonly publishedAt!: Date | null

  @Column({ length: 255, name: 'queue_name', type: 'varchar' })
  public readonly queueName!: string
}
