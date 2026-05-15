import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { ZodValidationPipe } from 'nestjs-zod'

import { WebEnv } from './configs/envs/web.env'
import { WebConfig } from './configs/web.config'
import { WebModule } from './web.module'

export const start = async(envs: NodeJS.ProcessEnv): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    WebModule.forRootAsync({ envs }),
    new FastifyAdapter(),
    { bufferLogs: true },
  )

  const logger = app.get(Logger)
  app.useLogger(logger)
  app.useGlobalPipes(new ZodValidationPipe())
  app.enableShutdownHooks()

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Purchase Service')
    .setDescription('Marketplace purchase service API')
    .setVersion('1.0')
    .addApiKey({ in: 'header', name: 'idempotency-key', type: 'apiKey' }, 'idempotency-key')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api', app, document)

  const webEnv = WebEnv.schema.parse(envs)
  const webConfig = new WebConfig(webEnv)

  await app.listen(webConfig.port, '0.0.0.0')

  logger.log(`Web server listening on port ${String(webConfig.port)}`)
}
