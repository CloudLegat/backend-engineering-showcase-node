import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class WebEnv extends createZodDto(
  z.object({
    PORT: z.coerce.number().default(3000),
  }),
) {}
