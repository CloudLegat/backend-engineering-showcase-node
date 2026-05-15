import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import * as amqp from 'amqplib'

import { RabbitMQPublisherConfig } from './configs/rabbitmq-publisher.config'
import { RabbitMQPublisherPort } from './rabbitmq-publisher.port'

@Injectable()
export class RabbitMQPublisher implements OnModuleDestroy, RabbitMQPublisherPort {
  private assertedQueues = new Set<string>()

  private channel: amqp.ConfirmChannel | undefined

  private connection: amqp.ChannelModel | undefined

  private readonly logger = new Logger(RabbitMQPublisher.name)

  public constructor(
    @Inject(RabbitMQPublisherConfig)
    private readonly config: RabbitMQPublisherConfig,
  ) {}

  public async onModuleDestroy(): Promise<void> {
    await this.channel?.close()
    await this.connection?.close()
  }

  public async publishMessageToQueue({ message, queueName }: { message: unknown, queueName: string }): Promise<void> {
    await this.ensureConnected()

    if (!this.assertedQueues.has(queueName)) {
      await this.assertQueue(queueName)
      this.assertedQueues.add(queueName)
    }

    const buffer = Buffer.from(JSON.stringify(message))
    const channel = this.channel as amqp.ConfirmChannel
    const sent = channel.sendToQueue(queueName, buffer, { persistent: true })

    if (!sent) {
      throw new Error(`Failed to publish message to queue ${queueName}`)
    }

    await channel.waitForConfirms()
  }

  private async assertQueue(queueName: string): Promise<void> {
    await (this.channel as amqp.ConfirmChannel).assertQueue(queueName, { durable: true })
  }

  private async connect(): Promise<void> {
    this.connection = await amqp.connect(this.config.rabbitMqUrl)

    /* c8 ignore next */
    this.connection.on('error', (err) => {
      this.logger.error(err, 'RabbitMQ connection error')
      this.invalidate()
    })

    this.channel = await this.connection.createConfirmChannel()

    /* c8 ignore next */
    this.channel.on('error', (err) => {
      this.logger.error(err, 'RabbitMQ channel error')
      this.invalidate()
    })
  }

  private async ensureConnected(): Promise<void> {
    if (this.channel === undefined) {
      await this.connect()
    }
  }

  private invalidate(): void {
    this.assertedQueues.clear()
    this.channel = undefined
    this.connection = undefined
  }
}
