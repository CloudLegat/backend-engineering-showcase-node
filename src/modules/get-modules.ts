import type { DynamicModule } from '@nestjs/common'

import type { CreateModuleParams } from '@/platform/bootstrap/types/create-module-params'

import { PurchaseModule } from './purchase/purchase.module'

export const getModules = (params: CreateModuleParams): DynamicModule[] => {
  return [PurchaseModule.forRootAsync(params)]
}
