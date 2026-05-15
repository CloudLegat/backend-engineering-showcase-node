import { Injectable } from '@nestjs/common'
import { DataSourceOptions } from 'typeorm'

import { CustomNamingStrategy } from '@/libs/typeorm/naming-strategy'

import { DbEnv } from './envs/db.env'

@Injectable()
export class DbConfig {
  public constructor(private readonly dbEnv: DbEnv) {}

  public createDataSourceOptions(): DataSourceOptions {
    return {
      database: this.dbEnv.DB_DATABASE,
      extra: {
        ...(this.dbEnv.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
        max: this.dbEnv.DB_POOL_SIZE,
      },
      host: this.dbEnv.DB_HOST,
      maxQueryExecutionTime: 1000,
      namingStrategy: new CustomNamingStrategy(),
      password: this.dbEnv.DB_PASSWORD,
      port: this.dbEnv.DB_PORT,
      schema: this.dbEnv.DB_SCHEMA,
      ssl: this.dbEnv.DB_SSL,
      subscribers: [],
      type: 'postgres',
      username: this.dbEnv.DB_USERNAME,
    } as const
  }
}
