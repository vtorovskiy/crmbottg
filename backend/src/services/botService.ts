// backend/src/services/botService.ts
import axios from 'axios'
import { db } from '@/config/database'
import { logger } from '@/utils/logger'
import type { TelegramUpdate, TelegramMessage, TelegramUser } from '@/types/telegram'
import { saveMessageToCRM, createOutgoingMessage } from '@/utils/messageUtils'

interface BotUser {
  id: number
  telegram_id: string
  username?: string
  first_name?: string
  last_name?: string
  is_subscribed: boolean
  total_calculations: number
  total_orders: number
}

interface ProductCalculation {
  id: number
  user_id: number
  spu_id: string
  product_title: string
  category: string
  size: string
  original_price: number
  calculated_price_standard: number
  calculated_price_express: number
  product_data: any
}

interface BotOrder {
  id: number
  user_id: number
  order_number: string
  product_title: string
  product_size: string
  category: string
  status: string
  amount: number
  delivery_type: string
  track_number?: string
}

interface BotSettings {
  [key: string]: string
}

class BotService {
  private botToken: string
  private apiUrl: string
  private settings: BotSettings = {}

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN!
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`

    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required')
    }
  }

  // =============== ПОЛЬЗОВАТЕЛИ ===============

  async findOrCreateUser(telegramUser: TelegramUser): Promise<BotUser> {
    try {
      const telegramId = telegramUser.id.toString()

      // Ищем существующего пользователя
      const existingQuery = 'SELECT * FROM bot_users WHERE telegram_id = $1'
      const existingResult = await db.query(existingQuery, [telegramId])

      if (existingResult.rows.length > 0) {
        // Обновляем информацию если изменилась
        const user = existingResult.rows[0]
        const needsUpdate =
          user.username !== telegramUser.username ||
          user.first_name !== telegramUser.first_name ||
          user.last_name !== telegramUser.last_name

        if (needsUpdate) {
          const updateQuery = `
            UPDATE bot_users 
            SET username = $1, first_name = $2, last_name = $3, last_activity = NOW()
            WHERE telegram_id = $4 
            RETURNING *
          `
          const updateResult = await db.query(updateQuery, [
            telegramUser.username,
            telegramUser.first_name,
            telegramUser.last_name,
            telegramId
          ])
          return updateResult.rows[0]
        } else {
          // Просто обновляем время активности
          await db.query(
            'UPDATE bot_users SET last_activity = NOW() WHERE telegram_id = $1',
            [telegramId]
          )
          return user
        }
      }

      // Создаем нового пользователя
      const insertQuery = `
        INSERT INTO bot_users (telegram_id, username, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `
      const insertResult = await db.query(insertQuery, [
        telegramId,
        telegramUser.username,
        telegramUser.first_name,
        telegramUser.last_name
      ])

      const newUser = insertResult.rows[0]

      // Логируем действие
      await this.logUserAction(newUser.id, 'registration', {
        telegram_id: telegramId,
        username: telegramUser.username
      })

      logger.info('New bot user created', {
        userId: newUser.id,
        telegramId,
        username: telegramUser.username
      })

      return newUser
    } catch (error) {
      logger.error('Error finding/creating bot user', error)
      throw error
    }
  }

  async checkSubscription(userId: string, channelUsername: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/getChatMember?chat_id=@${channelUsername}&user_id=${userId}`
      )

      const member = response.data.result
      const allowedStatuses = ['member', 'administrator', 'creator']
      const isSubscribed = allowedStatuses.includes(member.status)

      // Обновляем статус подписки в базе
      await db.query(
        'UPDATE bot_users SET is_subscribed = $1 WHERE telegram_id = $2',
        [isSubscribed, userId]
      )

      return isSubscribed
    } catch (error) {
      logger.warn('Subscription check failed', { userId, channelUsername, error })
      return false
    }
  }

  // =============== НАСТРОЙКИ ===============

  async loadSettings(): Promise<void> {
    try {
      const query = 'SELECT setting_key, setting_value FROM bot_settings'
      const result = await db.query(query)

      this.settings = {}
      result.rows.forEach(row => {
        this.settings[row.setting_key] = row.setting_value
      })

      logger.debug('Bot settings loaded', { count: result.rows.length })
    } catch (error) {
      logger.error('Error loading bot settings', error)
      throw error
    }
  }

  getSetting(key: string, defaultValue?: string): string {
    return this.settings[key] || defaultValue || ''
  }

  async updateSetting(key: string, value: string, updatedBy?: number): Promise<void> {
    try {
      const query = `
        INSERT INTO bot_settings (setting_key, setting_value, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = NOW()
      `

      await db.query(query, [key, value, updatedBy])
      this.settings[key] = value

      logger.info('Bot setting updated', { key, value, updatedBy })
    } catch (error) {
      logger.error('Error updating bot setting', error)
      throw error
    }
  }

  // =============== API ЛИМИТЫ ===============

  async checkApiLimit(userId: number, endpoint: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const limit = parseInt(this.getSetting('api_limit_per_user', '50'))

      const query = `
        SELECT request_count 
        FROM api_usage 
        WHERE user_id = $1 AND api_endpoint = $2 AND request_date = $3
      `

      const result = await db.query(query, [userId, endpoint, today])
      const currentCount = result.rows.length > 0 ? result.rows[0].request_count : 0

      return currentCount < limit
    } catch (error) {
      logger.error('Error checking API limit', error)
      return false
    }
  }

  async incrementApiUsage(userId: number, endpoint: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const query = `
        INSERT INTO api_usage (user_id, api_endpoint, request_date, request_count)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, api_endpoint, request_date)
        DO UPDATE SET 
          request_count = api_usage.request_count + 1,
          last_request_at = NOW()
      `

      await db.query(query, [userId, endpoint, today])
    } catch (error) {
      logger.error('Error incrementing API usage', error)
    }
  }

  async getApiUsage(userId: number): Promise<Record<string, number>> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const query = `
        SELECT api_endpoint, request_count 
        FROM api_usage 
        WHERE user_id = $1 AND request_date = $2
      `

      const result = await db.query(query, [userId, today])

      const usage: Record<string, number> = {}
      result.rows.forEach(row => {
        usage[row.api_endpoint] = row.request_count
      })

      return usage
    } catch (error) {
      logger.error('Error getting API usage', error)
      return {}
    }
  }

  // =============== РАСЧЕТЫ ТОВАРОВ ===============

  async saveCalculation(calculation: Omit<ProductCalculation, 'id'>): Promise<ProductCalculation> {
    try {
      const query = `
        INSERT INTO product_calculations (
          user_id, spu_id, product_title, category, size, 
          original_price, calculated_price_standard, calculated_price_express, 
          poizon_url, product_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      const result = await db.query(query, [
        calculation.user_id,
        calculation.spu_id,
        calculation.product_title,
        calculation.category,
        calculation.size,
        calculation.original_price,
        calculation.calculated_price_standard,
        calculation.calculated_price_express,
        calculation.product_data.url || '',
        JSON.stringify(calculation.product_data)
      ])

      // Увеличиваем счетчик расчетов у пользователя
      await db.query(
        'UPDATE bot_users SET total_calculations = total_calculations + 1 WHERE id = $1',
        [calculation.user_id]
      )

      return result.rows[0]
    } catch (error) {
      logger.error('Error saving calculation', error)
      throw error
    }
  }

  // =============== ЗАКАЗЫ ===============

  async createOrder(order: Omit<BotOrder, 'id' | 'order_number'>): Promise<BotOrder> {
    try {
      const query = `
        INSERT INTO bot_orders (
          user_id, product_title, product_size, category, 
          status, amount, delivery_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `

      const result = await db.query(query, [
        order.user_id,
        order.product_title,
        order.product_size,
        order.category,
        order.status,
        order.amount,
        order.delivery_type
      ])

      // Увеличиваем счетчик заказов у пользователя
      await db.query(
        'UPDATE bot_users SET total_orders = total_orders + 1 WHERE id = $1',
        [order.user_id]
      )

      const newOrder = result.rows[0]

      // Логируем создание заказа
      await this.logUserAction(order.user_id, 'order_created', {
        order_number: newOrder.order_number,
        amount: order.amount,
        delivery_type: order.delivery_type
      })

      logger.info('Bot order created', {
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        userId: order.user_id
      })

      return newOrder
    } catch (error) {
      logger.error('Error creating bot order', error)
      throw error
    }
  }

  async getOrdersByUser(userId: number): Promise<BotOrder[]> {
    try {
      const query = `
        SELECT * FROM bot_orders 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `

      const result = await db.query(query, [userId])
      return result.rows
    } catch (error) {
      logger.error('Error getting user orders', error)
      return []
    }
  }

  async updateOrderStatus(
    orderNumber: string,
    status: string,
    trackNumber?: string
  ): Promise<BotOrder | null> {
    try {
      let query = 'UPDATE bot_orders SET status = $1'
      const params = [status]

      if (trackNumber) {
        query += ', track_number = $2'
        params.push(trackNumber)
      }

      query += ` WHERE order_number = $${params.length + 1} RETURNING *`
      params.push(orderNumber)

      const result = await db.query(query, params)

      if (result.rows.length > 0) {
        logger.info('Bot order status updated', {
          orderNumber,
          status,
          trackNumber
        })
        return result.rows[0]
      }

      return null
    } catch (error) {
      logger.error('Error updating order status', error)
      return null
    }
  }

  // =============== ЛОГИРОВАНИЕ ===============

  async logUserAction(
    userId: number,
    actionType: string,
    actionData?: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO bot_user_actions (user_id, action_type, action_data)
        VALUES ($1, $2, $3)
      `

      await db.query(query, [
        userId,
        actionType,
        actionData ? JSON.stringify(actionData) : null
      ])
    } catch (error) {
      logger.error('Error logging user action', error)
    }
  }

  // =============== СТАТИСТИКА ===============

  async getStats(): Promise<Record<string, any>> {
    try {
      const queries = await Promise.all([
        db.query('SELECT COUNT(*) as total_users FROM bot_users'),
        db.query('SELECT COUNT(*) as total_calculations FROM product_calculations'),
        db.query('SELECT COUNT(*) as total_orders FROM bot_orders'),
        db.query('SELECT COUNT(*) as active_users FROM bot_users WHERE last_activity > NOW() - INTERVAL \'7 days\''),
        db.query(`
          SELECT category, COUNT(*) as count 
          FROM product_calculations 
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY category 
          ORDER BY count DESC
        `),
        db.query(`
          SELECT 
            COALESCE(SUM(request_count), 0) as total_api_requests,
            COUNT(DISTINCT user_id) as unique_api_users
          FROM api_usage 
          WHERE request_date = CURRENT_DATE
        `)
      ])

      return {
        totalUsers: parseInt(queries[0].rows[0].total_users),
        totalCalculations: parseInt(queries[1].rows[0].total_calculations),
        totalOrders: parseInt(queries[2].rows[0].total_orders),
        activeUsers: parseInt(queries[3].rows[0].active_users),
        popularCategories: queries[4].rows,
        todayApiRequests: parseInt(queries[5].rows[0].total_api_requests),
        todayApiUsers: parseInt(queries[5].rows[0].unique_api_users)
      }
    } catch (error) {
      logger.error('Error getting bot stats', error)
      return {}
    }
  }

  // =============== TELEGRAM API ===============

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: any & { contact_id?: number } // 🆕 добавляем contact_id
  ): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      })

      // 🆕 Сохраняем исходящее сообщение в CRM (если есть contact_id в options)
      if (options?.contact_id) {
        try {
          const outgoingMessage = createOutgoingMessage(
            response.data.result.message_id,
            text,
            chatId
          )
          await saveMessageToCRM(outgoingMessage, options.contact_id, 'outgoing')
        } catch (error) {
          logger.warn('Could not save outgoing message to CRM', error as Error)
        }
      }

      return response.data.result
    } catch (error) {
      logger.error('Error sending Telegram message', error)
      throw error
    }
  }

  async sendPhoto(
    chatId: number | string,
    photo: string,
    options?: any
  ): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendPhoto`, {
        chat_id: chatId,
        photo,
        parse_mode: 'HTML',
        ...options
      })

      return response.data.result
    } catch (error) {
      logger.error('Error sending Telegram photo', error)
      throw error
    }
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: any
  ): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        ...options
      })

      return response.data.result
    } catch (error) {
      logger.error('Error editing Telegram message', error)
      throw error
    }
  }

  // =============== ИНИЦИАЛИЗАЦИЯ ===============

  async initialize(): Promise<void> {
    try {
      await this.loadSettings()
      logger.info('Bot service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize bot service', error)
      throw error
    }
  }
}

export const botService = new BotService()