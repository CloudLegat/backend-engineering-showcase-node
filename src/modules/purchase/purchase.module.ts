import { DynamicModule, Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { CreatePurchaseCommandHandler } from '@/modules/purchase/application/commands/handlers/create-purchase-command.handler'
import { PURCHASE_UNIT_OF_WORK_PORT } from '@/modules/purchase/application/ports/purchase-unit-of-work.port'
import { PurchaseUnitOfWorkAdapter } from '@/modules/purchase/infrastructure/database/purchase-unit-of-work.adapter'
import { IdempotencyKeyEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/idempotency-key.entity'
import { OutboxEventEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/outbox-event.entity'
import { ProductEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/product.entity'
import { PurchaseEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/purchase.entity'
import { UserEntity } from '@/modules/purchase/infrastructure/database/typeorm/entities/user.entity'
import { OutboxRelayService } from '@/modules/purchase/infrastructure/messaging/outbox-relay.service'
import { PurchaseController } from '@/modules/purchase/user-interface/purchase.controller'
import { CreateModuleParams } from '@/platform/bootstrap/types/create-module-params'
import { ZodConfigModule } from '@/platform/config/zod-config.module'
import { DatabaseModule } from '@/platform/database/database.module'
import { RabbitMQEnv } from '@/platform/messaging/rabbitmq/configs/envs/rabbitmq.env'
import { RabbitMQPublisherConfig } from '@/platform/messaging/rabbitmq/configs/rabbitmq-publisher.config'
import { RabbitMQPublisher } from '@/platform/messaging/rabbitmq/rabbitmq-publisher'
import { RABBITMQ_PUBLISHER_PORT } from '@/platform/messaging/rabbitmq/rabbitmq-publisher.port'

const entities = [IdempotencyKeyEntity, OutboxEventEntity, ProductEntity, PurchaseEntity, UserEntity]

@Module({})
export class PurchaseModule {
  public static forRootAsync(params: CreateModuleParams): DynamicModule {
    const { envs } = params

    return {
      controllers: [PurchaseController],
      imports: [
        CqrsModule,
        DatabaseModule.forFeature(entities),
        ZodConfigModule.forFeature({
          configs: [RabbitMQPublisherConfig],
          source: envs,
          zodEnvs: [RabbitMQEnv],
        }),
      ],
      module: PurchaseModule,
      providers: [
        OutboxRelayService,
        PurchaseUnitOfWorkAdapter,
        {
          provide: PURCHASE_UNIT_OF_WORK_PORT,
          useExisting: PurchaseUnitOfWorkAdapter,
        },
        CreatePurchaseCommandHandler,
        {
          provide: RABBITMQ_PUBLISHER_PORT,
          useClass: RabbitMQPublisher,
        },
      ],
    }
  }
}
