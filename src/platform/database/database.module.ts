/* c8 ignore start */
// Stryker disable all
import path from 'node:path'

import { DynamicModule, Module } from '@nestjs/common'
import { InjectDataSource, InjectRepository, TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'

import { ZodConfigModule } from '@/platform/config/zod-config.module'

import { DbConfig } from './configs/db.config'
import { DbEnv } from './configs/envs/db.env'

@Module({})
export class DatabaseModule {
  private static readonly connectionName = 'internal'

  public static forFeature(entities: Required<Parameters<(typeof TypeOrmModule)['forFeature']>[0]>): DynamicModule {
    return {
      exports: [TypeOrmModule],
      imports: [TypeOrmModule.forFeature(entities, DatabaseModule.connectionName)],
      module: DatabaseModule,
    }
  }

  public static forRootAsync({
    envs,
    migrationsRun = false,
  }: {
    envs: NodeJS.ProcessEnv
    migrationsRun?: boolean
  }): DynamicModule {
    const typeormRootDirs = path.join(__dirname, '../../**/typeorm')

    return {
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ZodConfigModule.forFeature({ configs: [DbConfig], source: envs, zodEnvs: [DbEnv] })],
          inject: [DbConfig],
          name: DatabaseModule.connectionName,
          useFactory: (dbConfig: DbConfig): TypeOrmModuleOptions => {
            const pathToEntities = path.join(typeormRootDirs, 'entities/**/*.entity.{ts,js}')
            const pathToMigrations = path.join(typeormRootDirs, 'migrations/*{.ts,.js}')

            return {
              entities: [pathToEntities],
              logging: ['warn', 'error', 'migration'],
              migrations: [pathToMigrations],
              name: DatabaseModule.connectionName,
              ...dbConfig.createDataSourceOptions(),
              migrationsRun,
            }
          },
        }),
      ],
      module: DatabaseModule,
    }
  }

  public static InjectDataSource(): ReturnType<typeof InjectDataSource> {
    return InjectDataSource(DatabaseModule.connectionName)
  }

  public static InjectRepository(entity: Parameters<typeof InjectRepository>[0]): ReturnType<typeof InjectRepository> {
    return InjectRepository(entity, DatabaseModule.connectionName)
  }
}

/* c8 ignore stop */
