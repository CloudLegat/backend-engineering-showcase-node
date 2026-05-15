import { DynamicModule, Module } from '@nestjs/common'

import { getModules } from '@/modules/get-modules'
import { ZodConfigModule } from '@/platform/config/zod-config.module'
import { DatabaseModule } from '@/platform/database/database.module'
import { PinoLoggerModule } from '@/platform/logging/pino-logger.module'

import { WebEnv } from './configs/envs/web.env'
import { WebConfig } from './configs/web.config'

@Module({})
export class WebModule {
  public static forRootAsync({ envs }: { envs: NodeJS.ProcessEnv }): DynamicModule {
    return {
      imports: [
        PinoLoggerModule.forRootAsync({ envs }),
        DatabaseModule.forRootAsync({ envs, migrationsRun: true }),
        ZodConfigModule.forFeature({
          configs: [WebConfig],
          source: envs,
          zodEnvs: [WebEnv],
        }),
        ...getModules({ envs, mode: 'web' }),
      ],
      module: WebModule,
    }
  }
}
