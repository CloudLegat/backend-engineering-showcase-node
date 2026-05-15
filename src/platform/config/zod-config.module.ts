import { DynamicModule, Module, Type } from '@nestjs/common'
import { ZodDto } from 'nestjs-zod'
import { z } from 'zod'

interface ForFeatureParams {
  configs: Type[]
  source: object
  zodEnvs: ZodDto<z.ZodType>[]
}

@Module({})
export class ZodConfigModule {
  public static forFeature({ configs, source, zodEnvs }: ForFeatureParams): DynamicModule {
    return {
      exports: [...configs],
      module: ZodConfigModule,
      providers: [
        ...configs,
        ...zodEnvs.map((zodEnv) => ({
          provide: zodEnv,
          useValue: zodEnv.create(source),
        })),
      ],
    }
  }
}
