import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class RabbitMQEnv extends createZodDto(
  z.object({
    RABBITMQ_HOST: z.string(),
    RABBITMQ_PASSWORD: z.string(),
    RABBITMQ_PORT: z.coerce.number().default(5672),
    RABBITMQ_USERNAME: z.string(),
  }),
) {}
