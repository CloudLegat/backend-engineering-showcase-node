import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export enum LoggerLevel {
  debug = 'debug',
  error = 'error',
  fatal = 'fatal',
  info = 'info',
  silent = 'silent',
  trace = 'trace',
  warn = 'warn',
}

export class LoggerEnv extends createZodDto(
  z.object({
    LOG_LEVEL: z.enum(LoggerLevel).default(LoggerLevel.info),
  }),
) {}
