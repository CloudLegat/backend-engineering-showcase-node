import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DataSource, EntityManager, IsNull } from 'typeorm'

import type { RabbitMQPublisherPort } from '@/platform/messaging/rabbitmq/rabbitmq-publisher.port'

import { OutboxEventEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/outbox-event.entity'
import { DatabaseModule } from '@/platform/database/database.module'
import { RABBITMQ_PUBLISHER_PORT } from '@/platform/messaging/rabbitmq/rabbitmq-publisher.port'

const RELAY_INTERVAL_MS = 5_000
const BATCH_SIZE = 50

@Injectable()
export class OutboxRelayService implements OnModuleDestroy, OnModuleInit {
  private intervalId: NodeJS.Timeout | undefined

  private readonly logger = new Logger(OutboxRelayService.name)

  private relayRunning = false

  public constructor(
    @DatabaseModule.InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(RABBITMQ_PUBLISHER_PORT)
    private readonly rabbitMQPublisher: RabbitMQPublisherPort,
  ) {}

  public onModuleDestroy(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId)
    }
  }

  public onModuleInit(): void {
    this.intervalId = setInterval(() => void this.relayPendingEvents(), RELAY_INTERVAL_MS)
  }

  private async publishEvent(event: OutboxEventEntity, manager: EntityManager): Promise<void> {
    await this.rabbitMQPublisher.publishMessageToQueue({
      message: event.payload,
      queueName: event.queueName,
    })

    await manager.update(OutboxEventEntity, { id: event.id }, { publishedAt: new Date() })
  }

  private async relayPendingEvents(): Promise<void> {
    if (this.relayRunning) {
      return
    }

    this.relayRunning = true

    try {
      await this.dataSource.transaction(async (manager) => {
        const events = await manager.find(OutboxEventEntity, {
          lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
          order: { createdAt: 'ASC' },
          take: BATCH_SIZE,
          where: { publishedAt: IsNull() },
        })

        for (const event of events) {
          try {
            await this.publishEvent(event, manager)
          } catch (err: unknown) {
            this.logger.error({ err, eventId: event.id }, 'Failed to relay outbox event')
          }
        }
      })
    } finally {
      this.relayRunning = false
    }
  }
}
