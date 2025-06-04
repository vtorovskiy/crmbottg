import { Pool, PoolConfig } from 'pg'
import { logger } from '@/utils/logger'

interface DatabaseConfig extends PoolConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | object
}

class Database {
  private pool: Pool | null = null
  private config: DatabaseConfig

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'telegram_crm',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,

      // Connection pool settings для высокой производительности
      max: 20,                    // максимальное количество соединений
      min: 5,                     // минимальное количество соединений
      idleTimeoutMillis: 30000,   // время жизни неактивного соединения
      connectionTimeoutMillis: 10000, // таймаут подключения

      // Настройки для стабильности
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    }
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool(this.config)

      // Тестируем подключение
      const client = await this.pool.connect()
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version')

      logger.info('Database connected successfully', {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version.split(' ')[0],
        host: this.config.host,
        database: this.config.database,
        poolSize: this.config.max
      })

      client.release()

      // Обработчики событий pool
      this.pool.on('connect', (client) => {
        logger.debug('New database client connected')
      })

      this.pool.on('acquire', (client) => {
        logger.debug('Client acquired from pool')
      })

      this.pool.on('error', (err) => {
        logger.error('Database pool error', err)
      })

      // Проверяем схему базы данных
      await this.ensureSchema()

    } catch (error) {
      logger.error('Failed to connect to database', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      logger.info('Database disconnected')
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.pool
  }

  // Wrapper для выполнения запросов с логированием
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected')
    }

    const start = Date.now()
    try {
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start

      logger.debug('Database query executed', {
        query: text.substring(0, 100),
        duration,
        rowCount: result.rowCount
      })

      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error('Database query failed', error, {
        query: text.substring(0, 100),
        params: params?.length,
        duration
      })
      throw error
    }
  }

  // Транзакции для безопасных операций
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected')
    }

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')

      logger.debug('Transaction completed successfully')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Transaction rolled back', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Проверка и создание базовой схемы
  private async ensureSchema(): Promise<void> {
    try {
      // Проверяем существование основных таблиц
      const tableCheckQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `

      const result = await this.query(tableCheckQuery)
      const existingTables = result.rows.map((row: any) => row.table_name)

      const requiredTables = ['users', 'contacts', 'deals', 'messages', 'contact_fields']
      const missingTables = requiredTables.filter(table => !existingTables.includes(table))

      if (missingTables.length > 0) {
        logger.warn('Missing database tables detected', { missingTables })
        logger.info('Run migrations to create required tables: npm run migrate')
      } else {
        logger.info('Database schema validation passed')
      }

    } catch (error) {
      logger.error('Schema validation failed', error)
    }
  }

  // Метод для проверки здоровья БД
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.pool) {
        return { healthy: false, details: { error: 'Database not connected' } }
      }

      const start = Date.now()
      const result = await this.query('SELECT 1 as health_check')
      const responseTime = Date.now() - start

      const poolInfo = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      }

      return {
        healthy: result.rows[0].health_check === 1,
        details: {
          responseTime,
          pool: poolInfo
        }
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Singleton instance
const database = new Database()

export const connectDatabase = () => database.connect()
export const disconnectDatabase = () => database.disconnect()
export const db = database
export default database