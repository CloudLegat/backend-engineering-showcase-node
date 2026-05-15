import { DynamicModule, Global, Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import { ZodConfigModule } from '@/platform/config/zod-config.module'

import { LoggerEnv } from './configs/envs/logger.env'
import { PinoLoggerConfig } from './configs/pino-logger.config'

@Global()
@Module({})
export class PinoLoggerModule {
  public static forRootAsync({ envs }: { envs: NodeJS.ProcessEnv }): DynamicModule {
    return {
      imports: [
        LoggerModule.forRootAsync({
          imports: [ZodConfigModule.forFeature({ configs: [PinoLoggerConfig], source: envs, zodEnvs: [LoggerEnv] })],
          inject: [PinoLoggerConfig],
          useFactory: (config: PinoLoggerConfig) => config.createOptions(),
        }),
      ],
      module: PinoLoggerModule,
    }
  }
}
