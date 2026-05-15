import type { Config } from '@jest/types'

import { readFileSync } from 'fs'

import JSON5 from 'json5'
import { pathsToModuleNameMapper } from 'ts-jest'

const parsedTsConfig: unknown = JSON5.parse(readFileSync('tsconfig.json').toString())

const tsConfig = parsedTsConfig as {
  compilerOptions: {
    paths: Record<string, string[]>
  }
}

const { paths } = tsConfig.compilerOptions

export default {
  maxWorkers: 1,
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  modulePaths: ['<rootDir>'],
  preset: 'ts-jest',
  roots: ['src'],
  testEnvironment: 'node',
} as Config.InitialProjectOptions
