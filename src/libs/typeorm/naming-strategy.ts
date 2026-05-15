/* c8 ignore start */
// Stryker disable all
import type { NamingStrategyInterface } from 'typeorm'

import pluralize from 'pluralize'
import { DefaultNamingStrategy } from 'typeorm'
import { snakeCase } from 'typeorm/util/StringUtils'

export class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
   
  public override checkConstraintName(tableOrName: string, expression: string): string {
    return snakeCase(`constraint_${tableOrName}_${expression}_ck`)
  }

  // eslint-disable-next-line better-max-params/better-max-params
  public override columnName(propertyName: string, customName?: string, embeddedPrefixes: string[] = []): string {
    const prefix = embeddedPrefixes.join('_')
    const name = customName !== undefined ? customName : propertyName

    if (prefix.length > 0) {
      return snakeCase(`${prefix}_${name}`)
    }

    return snakeCase(name)
  }

   
  public override foreignKeyName(tableOrName: string, columnNames: string[]): string {
    return snakeCase(`${tableOrName}_${columnNames.join('_')}_fk`)
  }

   
  public override indexName(tableOrName: string, columns: string[]): string {
    return snakeCase(`${tableOrName}_${columns.join('_')}_indx`)
  }

   
  public override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`)
  }

  // eslint-disable-next-line better-max-params/better-max-params
  public override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    const column = columnName !== undefined ? columnName : propertyName

    return snakeCase(`${tableName}_${column}`)
  }

  // eslint-disable-next-line better-max-params/better-max-params
  public override joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return snakeCase(`${firstTableName}_${firstPropertyName}_${secondTableName}`)
  }

   
  public override primaryKeyName(tableOrName: string, columnNames: string[]): string {
    return snakeCase(`${tableOrName}_${columnNames.join('_')}_pk`)
  }

  public override relationName(propertyName: string): string {
    return snakeCase(propertyName)
  }

   
  public override tableName(targetName: string, userSpecifiedName?: string): string {
    if (userSpecifiedName !== undefined) {
      return userSpecifiedName
    }

    const normalized = targetName.replace(/Entity$/i, '')
    const snake = snakeCase(normalized)
    const parts = snake.split('_')
    const last = parts.pop() ?? ''
    const plural = pluralize(last)
    parts.push(plural)

    return parts.join('_')
  }

   
  public override uniqueConstraintName(tableOrName: string, columnNames: string[]): string {
    return snakeCase(`${tableOrName}_${columnNames.join('_')}_uk`)
  }
}

/* c8 ignore stop */
