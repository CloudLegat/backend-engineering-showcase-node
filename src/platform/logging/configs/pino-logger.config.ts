import { Injectable } from '@nestjs/common'
import * as nestjsPino from 'nestjs-pino'
import pino from 'pino'

import { LoggerEnv, LoggerLevel } from './envs/logger.env'

const pinoLevelToSeverityLookup: Record<LoggerLevel, Uppercase<string>> = {
  debug: 'DEBUG',
  error: 'ERROR',
  fatal: 'CRITICAL',
  info: 'INFO',
  silent: 'SILENT',
  trace: 'DEBUG',
  warn: 'WARNING',
} satisfies Record<pino.LevelWithSilent, Uppercase<string>>

const severityLookup = new Map<string, string>(Object.entries(pinoLevelToSeverityLookup))

@Injectable()
export class PinoLoggerConfig {
  public constructor(private readonly loggerEnv: LoggerEnv) {}

  public createOptions(): nestjsPino.Params {
    return {
      pinoHttp: {
        autoLogging: true,
         
        customLogLevel: (_req, res): pino.LevelWithSilent => {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn'
          }

          if (res.statusCode >= 500) {
            return 'error'
          }

          return 'info'
        },
        formatters: {
           
          level(label: string, number: number): { level: number, severity: string | undefined } {
            return {
              level: number,
              severity: severityLookup.get(label) ?? pinoLevelToSeverityLookup.info,
            }
          },
        },
        level: this.loggerEnv.LOG_LEVEL,
        quietReqLogger: true,
        redact: [
          '*.*.password',
          '*.password',
          'apikey',
          'appid',
          'key',
          'password',
          'req.headers.authorization',
          'req.headers.cookie',
          'token',
        ],
      },
    }
  }
}
