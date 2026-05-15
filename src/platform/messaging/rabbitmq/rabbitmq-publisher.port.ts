export const RABBITMQ_PUBLISHER_PORT = Symbol('RABBITMQ_PUBLISHER_PORT')

export interface RabbitMQPublisherPort {
  publishMessageToQueue(params: { message: unknown, queueName: string }): Promise<void>
}
