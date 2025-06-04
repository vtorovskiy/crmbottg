import fs from 'fs'
import path from 'path'

// Создаем папку для логов если не существует
const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
  meta?: Record<string, any>
  stack?: string
}

class Logger {
  private logFile: string
  private logLevel: string

  constructor() {
    this.logFile = process.env.LOG_FILE || path.join(logDir, 'app.log')
    this.logLevel = process.env.LOG_LEVEL || 'info'
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = levels[this.logLevel as keyof typeof levels] || 1
    const messageLevel = levels[level as keyof typeof levels] || 1
    return messageLevel >= currentLevel
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, meta, stack } = entry
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (meta && Object.keys(meta).length > 0) {
      formatted += ` | ${JSON.stringify(meta)}`
    }

    if (stack) {
      formatted += `\n${stack}`
    }

    return formatted
  }

  private writeLog(entry: LogEntry): void {
    const formatted = this.formatMessage(entry)

    // Console output с цветами
    const colors = {
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      debug: '\x1b[35m',   // magenta
      reset: '\x1b[0m'     // reset
    }

    const color = colors[entry.level] || colors.reset
    console.log(`${color}${formatted}${colors.reset}`)

    // File output (только в production)
    if (process.env.NODE_ENV === 'production') {
      fs.appendFileSync(this.logFile, formatted + '\n', 'utf8')
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('info')) return

    this.writeLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      meta
    })
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return

    this.writeLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      meta
    })
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    if (!this.shouldLog('error')) return

    let stack: string | undefined
    if (error instanceof Error) {
      stack = error.stack
    } else if (error) {
      stack = String(error)
    }

    this.writeLog({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      meta,
      stack
    })
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return

    this.writeLog({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      meta
    })
  }

  // Метод для логирования HTTP запросов
  http(method: string, url: string, statusCode: number, responseTime: number, userAgent?: string): void {
    this.info(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      method,
      url,
      statusCode,
      responseTime,
      userAgent
    })
  }

  // Метод для логирования Telegram API вызовов
  telegram(action: string, success: boolean, responseTime?: number, error?: string): void {
    const level = success ? 'info' : 'error'
    const message = `Telegram API: ${action} ${success ? 'success' : 'failed'}`

    this[level](message, {
      action,
      success,
      responseTime,
      error
    })
  }
}

export const logger = new Logger()