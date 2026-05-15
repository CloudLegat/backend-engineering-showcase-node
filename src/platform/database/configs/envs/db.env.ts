import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class DbEnv extends createZodDto(
  z.object({
    DB_DATABASE: z.string(),
    DB_HOST: z.string(),
    DB_PASSWORD: z.string().optional().default(''),
    DB_POOL_SIZE: z.coerce.number().default(50),
    DB_PORT: z.coerce.number(),
    DB_SCHEMA: z.string().optional().default('main'),
    DB_SSL: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    DB_USERNAME: z.string(),
  }),
) {}
