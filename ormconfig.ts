import path from 'path'
import * as process from 'process'

import { DataSource } from 'typeorm'

import { DbConfig } from '@/platform/database/configs/db.config'
import { DbEnv } from '@/platform/database/configs/envs/db.env'

const dbConfig = new DbConfig(DbEnv.schema.parse(process.env))
const migrations = [path.resolve('./src/modules/**/typeorm/migrations/*{.ts,.js}')]
const entities = [path.resolve('./src/modules/**/typeorm/entities/**/*{.ts,.js}')]

export default new DataSource({ ...dbConfig.createDataSourceOptions(), entities, migrations })
