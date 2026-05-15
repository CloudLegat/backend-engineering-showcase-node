import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class CreatePurchaseRequestDto extends createZodDto(
  z.object({
    buyerId: z.uuid(),
    productId: z.uuid(),
  }),
) {}
