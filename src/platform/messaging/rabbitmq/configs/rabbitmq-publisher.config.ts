import { Injectable } from '@nestjs/common'

import { RabbitMQEnv } from './envs/rabbitmq.env'

@Injectable()
export class RabbitMQPublisherConfig {
  public readonly rabbitMqUrl: string

  public constructor(env: RabbitMQEnv) {
    this.rabbitMqUrl = `amqp://${env.RABBITMQ_USERNAME}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${String(env.RABBITMQ_PORT)}`
  }
}
