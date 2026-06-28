import * as winston from 'winston'
import { join } from 'path'
import { mkdirSync } from 'fs'

const isDev = process.env['NODE_ENV'] !== 'production'

// Temporary log directory until setLogDirectory() is called after app.ready
const defaultLogDir = join(process.env['HOME'] ?? '/tmp', '.config', 'Black Network', 'logs')
try {
  mkdirSync(defaultLogDir, { recursive: true })
} catch {
  /* ignore */
}

const fileTransport = new winston.transports.File({
  filename: join(defaultLogDir, 'black-network.log'),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 3,
  tailable: true,
})

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
        : `${timestamp} [${level.toUpperCase()}] ${message}`
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => `${level}: ${message}`)
      ),
    }),
    fileTransport,
  ],
})

export function setLogDirectory(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true })
    logger.remove(fileTransport)
    logger.add(
      new winston.transports.File({
        filename: join(dir, 'black-network.log'),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        tailable: true,
      })
    )
  } catch (err) {
    logger.warn(`Could not set log directory to ${dir}: ${err}`)
  }
}
