// backend/src/controllers/botController.ts
import { Request, Response } from 'express'
import crypto from 'crypto'
import { botService } from '@/services/botService'
import { botMessageHandler } from '@/services/botMessageHandler'
import { logger } from '@/utils/logger'
import type { TelegramUpdate } from '@/types/telegram'

export class BotController {

  /**
   * Обработчик webhook от Telegram
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-telegram-bot-api-secret-token'] as string
      const body = JSON.stringify(req.body)

      // Проверяем подпись webhook (опционально)
      if (process.env.TELEGRAM_WEBHOOK_SECRET && signature) {
        const isValid = this.verifyWebhookSignature(body, signature)
        if (!isValid) {
          logger.warn('Invalid webhook signature', {
            signature: signature.substring(0, 10) + '...',
            ip: req.ip,
            userAgent: req.get('User-Agent')
          })
          res.status(403).json({ success: false, message: 'Invalid signature' })
          return
        }
      }

      const update: TelegramUpdate = req.body

      // Валидируем структуру update
      if (!update || typeof update.update_id !== 'number') {
        logger.warn('Invalid update structure', { update })
        res.status(400).json({ success: false, message: 'Invalid update structure' })
        return
      }

      logger.debug('Received Telegram update', {
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query
      })

      // Обрабатываем обновление асинхронно
      this.processUpdate(update).catch(error => {
        logger.error('Error processing Telegram update', error, {
          updateId: update.update_id
        })
      })

      // Быстро отвечаем Telegram что получили update
      res.status(200).json({ success: true })

    } catch (error) {
      logger.error('Webhook processing error', error, {
        body: req.body,
        headers: req.headers
      })
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  }

  /**
   * Асинхронная обработка Telegram update
   */
  private async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Обрабатываем сообщения
      if (update.message) {
        await botMessageHandler.handleMessage(update.message)
      }

      // Обрабатываем callback query (нажатия на inline кнопки)
      if (update.callback_query) {
        await botMessageHandler.handleCallbackQuery(update.callback_query)
      }

      // Другие типы обновлений пока игнорируем
      if (update.edited_message) {
        logger.debug('Received edited message, ignoring', {
          updateId: update.update_id
        })
      }

    } catch (error) {
      logger.error('Error in processUpdate', error, {
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query
      })
    }
  }

  /**
   * Проверка подписи webhook
   */
  private verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET!
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(hash)
      )
    } catch (error) {
      logger.error('Error verifying webhook signature', error)
      return false
    }
  }

  /**
   * Уведомление о создании заказа (вызывается из CRM)
   */
  async notifyOrderCreated(req: Request, res: Response): Promise<void> {
    try {
      const {
        telegram_id,
        order_number,
        product_title,
        size,
        amount,
        delivery_type,
        manager_name,
        manager_username
      } = req.body

      // Валидация обязательных полей
      if (!telegram_id || !order_number || !product_title) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: telegram_id, order_number, product_title'
        })
        return
      }

      const text = `
✅ Ваш заказ подтвержден!

📋 Заказ: ${order_number}
📦 ${product_title}
📏 Размер: ${size || 'Не указан'}
💰 Сумма: ${amount?.toLocaleString('ru-RU')}₽
🚚 Тип доставки: ${delivery_type === 'express' ? 'Экспресс' : 'Стандартная'}

${manager_name ? `📞 Ваш менеджер: ${manager_name}` : ''}
${manager_username ? `💬 Связь: @${manager_username}` : ''}

Мы приступили к обработке вашего заказа!
Время выкупа: 3-5 рабочих дней
      `

      const keyboard = {
        inline_keyboard: [
          [{ text: '📦 Мои заказы', callback_data: 'my_orders' }],
          ...(manager_username ? [[{ text: '💬 Связаться с менеджером', url: `https://t.me/${manager_username}` }]] : [])
        ]
      }

      await botService.sendMessage(telegram_id, text, { reply_markup: keyboard })

      // Обновляем связь с CRM в базе данных
      await this.updateOrderCrmLink(order_number, req.body)

      logger.info('Order creation notification sent', {
        telegram_id,
        order_number,
        amount
      })

      res.json({
        success: true,
        message: 'Notification sent successfully'
      })

    } catch (error) {
      logger.error('Error sending order creation notification', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      })
    }
  }

  /**
   * Уведомление об изменении статуса заказа
   */
  async notifyStatusChange(req: Request, res: Response): Promise<void> {
    try {
      const {
        telegram_id,
        order_number,
        old_status,
        new_status,
        track_number
      } = req.body

      if (!telegram_id || !order_number || !new_status) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: telegram_id, order_number, new_status'
        })
        return
      }

      let text = ''
      let keyboard: any = {
        inline_keyboard: [
          [{ text: '📦 Мои заказы', callback_data: 'my_orders' }]
        ]
      }

      // Генерируем текст в зависимости от нового статуса
      switch (new_status) {
        case 'paid':
          text = `
💳 Оплата получена!

📋 Заказ: ${order_number}
💰 Оплата подтверждена ✅

Начинаем выкуп товара с POIZON.
Ожидаемое время: 3-5 рабочих дней.
          `
          break

        case 'shipped':
          text = `
🚚 Ваш заказ отправлен!

📋 Заказ: ${order_number}
${track_number ? `📦 Трек-номер: ${track_number}` : ''}

Посылка передана в СДЭК.
Ожидаемая доставка: 3-7 дней.

${track_number ? `🔍 Отследить посылку:\nhttps://www.cdek.ru/track?order=${track_number}` : ''}
          `

          if (track_number) {
            keyboard.inline_keyboard.unshift([
              { text: '📦 Отследить в СДЭК', url: `https://www.cdek.ru/track?order=${track_number}` }
            ])
          }
          break

        case 'delivered':
          // Для доставленных заказов используем отдельный метод
          await this.notifyOrderCompleted(req, res)
          return

        default:
          text = `
📊 Статус заказа изменен

📋 Заказ: ${order_number}
📈 Новый статус: ${this.getStatusText(new_status)}
          `
          break
      }

      await botService.sendMessage(telegram_id, text, { reply_markup: keyboard })

      // Обновляем статус в базе
      if (track_number) {
        await botService.updateOrderStatus(order_number, new_status, track_number)
      } else {
        await botService.updateOrderStatus(order_number, new_status)
      }

      logger.info('Status change notification sent', {
        telegram_id,
        order_number,
        old_status,
        new_status,
        track_number
      })

      res.json({
        success: true,
        message: 'Status notification sent successfully'
      })

    } catch (error) {
      logger.error('Error sending status change notification', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send status notification'
      })
    }
  }

  /**
   * Уведомление о завершении заказа
   */
  async notifyOrderCompleted(req: Request, res: Response): Promise<void> {
    try {
      const {
        telegram_id,
        order_number,
        product_title,
        amount,
        review_url
      } = req.body

      if (!telegram_id || !order_number) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: telegram_id, order_number'
        })
        return
      }

      const text = `
🎉 Заказ успешно доставлен!

📋 Заказ: ${order_number}
${product_title ? `📦 ${product_title}` : ''}
${amount ? `💰 ${amount.toLocaleString('ru-RU')}₽` : ''}

Спасибо за покупку в SQUARE! 🙏

Мы будем очень благодарны за ваш отзыв:
⭐ Оставить отзыв на нашем сайте
💬 Поделиться впечатлениями

Ваше мнение поможет нам стать лучше!
      `

      const reviewsUrl = review_url || botService.getSetting('reviews_url', '')

      const keyboard = {
        inline_keyboard: [
          ...(reviewsUrl ? [[{ text: '⭐ Оставить отзыв', url: reviewsUrl }]] : []),
          [{ text: '🛍️ Заказать еще', callback_data: 'calculate_cost' }],
          [{ text: '📞 Связаться с нами', callback_data: 'call_operator' }]
        ]
      }

      await botService.sendMessage(telegram_id, text, { reply_markup: keyboard })

      // Обновляем статус заказа
      await botService.updateOrderStatus(order_number, 'delivered')

      logger.info('Order completion notification sent', {
        telegram_id,
        order_number,
        amount
      })

      res.json({
        success: true,
        message: 'Completion notification sent successfully'
      })

    } catch (error) {
      logger.error('Error sending order completion notification', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send completion notification'
      })
    }
  }

  /**
   * Получение статистики бота
   */
  async getBotStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await botService.getStats()

      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      logger.error('Error getting bot stats', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get bot statistics'
      })
    }
  }

  /**
   * Тестирование подключения бота
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем Telegram API
      const botInfo = await this.getBotInfo()

      if (botInfo) {
        logger.info('Bot connection test successful', {
          botUsername: botInfo.username,
          botId: botInfo.id
        })

        res.json({
          success: true,
          message: 'Bot connection is working',
          data: {
            bot_id: botInfo.id,
            bot_username: botInfo.username,
            can_join_groups: botInfo.can_join_groups,
            can_read_all_group_messages: botInfo.can_read_all_group_messages,
            supports_inline_queries: botInfo.supports_inline_queries
          }
        })
      } else {
        res.status(503).json({
          success: false,
          message: 'Bot connection test failed'
        })
      }

    } catch (error) {
      logger.error('Bot connection test failed', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during connection test'
      })
    }
  }

  /**
   * Установка webhook
   */
  async setWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { url, secret_token } = req.body

      if (!url) {
        res.status(400).json({
          success: false,
          message: 'Webhook URL is required'
        })
        return
      }

      const result = await this.setupWebhook(url, secret_token)

      if (result.success) {
        logger.info('Webhook set successfully', { url, hasSecret: !!secret_token })
        res.json({
          success: true,
          message: 'Webhook set successfully',
          data: result
        })
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to set webhook',
          error: result.description
        })
      }

    } catch (error) {
      logger.error('Error setting webhook', error)
      res.status(500).json({
        success: false,
        message: 'Failed to set webhook'
      })
    }
  }

  /**
   * Получение информации о webhook
   */
  async getWebhookInfo(req: Request, res: Response): Promise<void> {
    try {
      const webhookInfo = await this.getWebhookStatus()

      res.json({
        success: true,
        data: webhookInfo
      })

    } catch (error) {
      logger.error('Error getting webhook info', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get webhook info'
      })
    }
  }

  /**
   * Отправка сообщения конкретному пользователю (для админов)
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { telegram_id, message, reply_markup } = req.body

      if (!telegram_id || !message) {
        res.status(400).json({
          success: false,
          message: 'telegram_id and message are required'
        })
        return
      }

      const result = await botService.sendMessage(telegram_id, message, { reply_markup })

      logger.info('Message sent via API', {
        telegram_id,
        message_id: result.message_id
      })

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          message_id: result.message_id,
          chat_id: result.chat.id
        }
      })

    } catch (error) {
      logger.error('Error sending message via API', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      })
    }
  }

  // =============== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===============

  /**
   * Обновление связи заказа с CRM
   */
  private async updateOrderCrmLink(orderNumber: string, crmData: any): Promise<void> {
    try {
      await botService.updateOrderStatus(
        orderNumber,
        'confirmed',
        undefined // track_number
      )

      // Дополнительно можно сохранить CRM ID сделки
      // await db.query(
      //   'UPDATE bot_orders SET crm_deal_id = $1 WHERE order_number = $2',
      //   [crmData.deal_id, orderNumber]
      // )

    } catch (error) {
      logger.error('Error updating order CRM link', error)
    }
  }

  /**
   * Получение информации о боте
   */
  private async getBotInfo(): Promise<any> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`)
      const data = await response.json()

      if ((data as any).ok) {
        return (data as any).result
      } else {
        logger.error('Failed to get bot info', data)
        return null
      }
    } catch (error) {
      logger.error('Error getting bot info', error)
      return null
    }
  }

  /**
   * Настройка webhook
   */
  private async setupWebhook(url: string, secretToken?: string): Promise<any> {
    try {
      const payload: any = {
        url,
        allowed_updates: ['message', 'callback_query']
      }

      if (secretToken) {
        payload.secret_token = secretToken
      }

      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      logger.error('Error setting up webhook', error)
      return { success: false, description: 'Network error' }
    }
  }

  /**
   * Получение статуса webhook
   */
  private async getWebhookStatus(): Promise<any> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      )
      const data = await response.json()

      if ((data as any).ok) {
        return (data as any).result
      } else {
        return { error: (data as any).description }
      }
    } catch (error) {
      logger.error('Error getting webhook status', error)
      return { error: 'Network error' }
    }
  }

  /**
   * Преобразование статуса в читаемый текст
   */
  private getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      'pending': 'В обработке',
      'confirmed': 'Подтвержден',
      'paid': 'Оплачен',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен'
    }
    return statusTexts[status] || status
  }
}

export const botController = new BotController()