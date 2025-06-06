// backend/src/controllers/messagesController.ts - ПОЛНАЯ ВЕРСИЯ
import { Request, Response } from 'express'
import { db } from '@/config/database'
import { logger } from '@/utils/logger'

export class MessagesController {

  // =============== ОТПРАВКА СООБЩЕНИЯ ===============
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { contactId, content, type = 'text' } = req.body
      const user = (req as any).user

      // Валидация входных данных
      if (!contactId || !content) {
        res.status(400).json({
          success: false,
          message: 'contactId и content обязательны'
        })
        return
      }

      // Проверяем существование контакта
      const contactQuery = 'SELECT id, telegram_id FROM contacts WHERE id = $1'
      const contactResult = await db.query(contactQuery, [contactId])

      if (contactResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Контакт не найден'
        })
        return
      }

      const contact = contactResult.rows[0]

      // ИСПРАВЛЕННЫЙ SQL запрос - убираем ON CONFLICT так как нет уникального ключа
      const insertQuery = `
        INSERT INTO messages (
          contact_id, 
          content, 
          type, 
          direction,
          is_read,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `

      const messageResult = await db.query(insertQuery, [
        contactId,
        content,
        type,
        'outgoing',
        true // исходящие сообщения всегда прочитаны
      ])

      const newMessage = messageResult.rows[0]

      // Обновляем последнее сообщение у контакта
      const updateContactQuery = `
        UPDATE contacts 
        SET updated_at = NOW()
        WHERE id = $1
      `
      await db.query(updateContactQuery, [contactId])

      // TODO: Здесь будет отправка через Telegram Bot API
      // Пока что логируем
      logger.info('Message saved to database', {
        messageId: newMessage.id,
        contactId,
        userId: user.id,
        type
      })

      res.status(201).json({
        success: true,
        data: {
          id: newMessage.id,
          contact_id: newMessage.contact_id,
          telegram_message_id: newMessage.telegram_message_id,
          content: newMessage.content,
          type: newMessage.type,
          direction: newMessage.direction,
          file_path: newMessage.file_path,
          file_name: newMessage.file_name,
          file_size: newMessage.file_size,
          is_read: newMessage.is_read || true,
          created_at: newMessage.created_at,
          sender_admin: user.email
        },
        message: 'Сообщение отправлено'
      })

    } catch (error) {
      logger.error('Error sending message', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при отправке сообщения'
      })
    }
  }

  // =============== ПОЛУЧЕНИЕ ИСТОРИИ СООБЩЕНИЙ ===============
  async getMessageHistory(req: Request, res: Response): Promise<void> {
    try {
      const contactId = parseInt(req.params.contactId)
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 50
      const offset = (page - 1) * limit

      if (!contactId || isNaN(contactId)) {
        res.status(400).json({
          success: false,
          message: 'Неверный ID контакта'
        })
        return
      }

      // Проверяем существование контакта
      const contactQuery = `
        SELECT 
          c.id,
          c.telegram_id,
          c.telegram_username,
          COALESCE(cd_name.value, c.telegram_username, CONCAT('User ', c.telegram_id)) as display_name
        FROM contacts c
        LEFT JOIN contact_data cd_name ON c.id = cd_name.contact_id 
          AND cd_name.field_id = (SELECT id FROM contact_fields WHERE name = 'Имя' LIMIT 1)
        WHERE c.id = $1
      `
      const contactResult = await db.query(contactQuery, [contactId])

      if (contactResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Контакт не найден'
        })
        return
      }

      const contact = contactResult.rows[0]

      // Получаем сообщения с пагинацией
      const messagesQuery = `
        SELECT 
          m.*,
          u.email as sender_admin
        FROM messages m
        LEFT JOIN users u ON m.direction = 'outgoing'
        WHERE m.contact_id = $1
        ORDER BY m.created_at ASC
        LIMIT $2 OFFSET $3
      `

      const messagesResult = await db.query(messagesQuery, [contactId, limit, offset])

      // Получаем общее количество сообщений
      const countQuery = 'SELECT COUNT(*) as total FROM messages WHERE contact_id = $1'
      const countResult = await db.query(countQuery, [contactId])
      const total = parseInt(countResult.rows[0].total)

      // Помечаем входящие сообщения как прочитанные
      const markReadQuery = `
        UPDATE messages 
        SET is_read = true 
        WHERE contact_id = $1 AND direction = 'incoming' AND (is_read = false OR is_read IS NULL)
      `
      await db.query(markReadQuery, [contactId])

      res.json({
        success: true,
        data: {
          contact: {
            id: contact.id,
            telegram_id: contact.telegram_id,
            telegram_username: contact.telegram_username,
            display_name: contact.display_name,
            online_status: 'offline' // TODO: Реальный статус
          },
          messages: messagesResult.rows.map(msg => ({
            id: msg.id,
            telegram_message_id: msg.telegram_message_id,
            content: msg.content,
            type: msg.type || 'text',
            direction: msg.direction,
            file_path: msg.file_path,
            file_name: msg.file_name,
            file_size: msg.file_size,
            is_read: msg.is_read || msg.direction === 'outgoing',
            created_at: msg.created_at,
            sender_admin: msg.sender_admin
          })),
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + limit < total
          }
        }
      })

    } catch (error) {
      logger.error('Error getting message history', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении истории сообщений'
      })
    }
  }

  // =============== ПОЛУЧЕНИЕ СПИСКА КОНТАКТОВ ===============
  async getContactsList(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string
      const limit = parseInt(req.query.limit as string) || 50

      let whereClause = ''
      let params: any[] = [limit]

      if (search) {
        whereClause = `
          WHERE (
            cd_name.value ILIKE $2 OR 
            c.telegram_username ILIKE $2 OR
            c.telegram_id::text ILIKE $2
          )
        `
        params.push(`%${search}%`)
      }

      const query = `
        SELECT 
          c.id,
          c.telegram_id,
          c.telegram_username,
          COALESCE(cd_name.value, c.telegram_username, CONCAT('User ', c.telegram_id)) as display_name,
          
          -- Последнее сообщение
          lm.content as last_message,
          lm.type as last_message_type,
          lm.direction as last_message_direction,
          lm.created_at as last_message_time,
          
          -- Количество непрочитанных
          COALESCE(unread.count, 0) as unread_count,
          
          -- Статус (пока статичный)
          'offline' as online_status
          
        FROM contacts c
        
        -- Подключаем имя из кастомных полей
        LEFT JOIN contact_data cd_name ON c.id = cd_name.contact_id 
          AND cd_name.field_id = (SELECT id FROM contact_fields WHERE name = 'Имя' LIMIT 1)
        
        -- Последнее сообщение
        LEFT JOIN LATERAL (
          SELECT content, type, direction, created_at
          FROM messages m1
          WHERE m1.contact_id = c.id
          ORDER BY m1.created_at DESC
          LIMIT 1
        ) lm ON true
        
        -- Количество непрочитанных сообщений
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as count
          FROM messages m2
          WHERE m2.contact_id = c.id 
            AND m2.direction = 'incoming' 
            AND (m2.is_read = false OR m2.is_read IS NULL)
        ) unread ON true
        
        ${whereClause}
        
        -- Сортируем по времени последнего сообщения
        ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
        LIMIT $1
      `

      const result = await db.query(query, params)

      res.json({
        success: true,
        data: result.rows.map(contact => ({
          id: contact.id,
          telegram_id: contact.telegram_id,
          telegram_username: contact.telegram_username,
          display_name: contact.display_name,
          last_message: contact.last_message,
          last_message_type: contact.last_message_type || 'text',
          last_message_direction: contact.last_message_direction,
          last_message_time: contact.last_message_time,
          unread_count: parseInt(contact.unread_count) || 0,
          online_status: contact.online_status,
          avatar_url: null // TODO: Добавить аватары
        }))
      })

    } catch (error) {
      logger.error('Error getting contacts list', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении списка контактов'
      })
    }
  }

  // =============== УДАЛЕНИЕ СООБЩЕНИЯ ===============
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.id)
      const user = (req as any).user

      if (!messageId || isNaN(messageId)) {
        res.status(400).json({
          success: false,
          message: 'Неверный ID сообщения'
        })
        return
      }

      // Проверяем существование сообщения и права на удаление
      const checkQuery = `
        SELECT id, direction, content 
        FROM messages 
        WHERE id = $1
      `
      const checkResult = await db.query(checkQuery, [messageId])

      if (checkResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Сообщение не найдено'
        })
        return
      }

      const message = checkResult.rows[0]

      // Можно удалять только исходящие сообщения
      if (message.direction !== 'outgoing') {
        res.status(403).json({
          success: false,
          message: 'Нельзя удалять входящие сообщения'
        })
        return
      }

      // Удаляем сообщение
      const deleteQuery = 'DELETE FROM messages WHERE id = $1'
      await db.query(deleteQuery, [messageId])

      logger.info('Message deleted', {
        messageId,
        userId: user.id,
        content: message.content.substring(0, 50)
      })

      res.json({
        success: true,
        message: 'Сообщение удалено'
      })

    } catch (error) {
      logger.error('Error deleting message', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении сообщения'
      })
    }
  }

  // =============== ПОМЕТКА КАК ПРОЧИТАННОЕ ===============
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const contactId = parseInt(req.params.contactId)

      if (!contactId || isNaN(contactId)) {
        res.status(400).json({
          success: false,
          message: 'Неверный ID контакта'
        })
        return
      }

      const query = `
        UPDATE messages 
        SET is_read = true 
        WHERE contact_id = $1 AND direction = 'incoming' AND (is_read = false OR is_read IS NULL)
      `

      const result = await db.query(query, [contactId])

      res.json({
        success: true,
        data: {
          updated: result.rowCount || 0
        },
        message: 'Сообщения помечены как прочитанные'
      })

    } catch (error) {
      logger.error('Error marking messages as read', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при пометке сообщений'
      })
    }
  }

  // =============== СТАТИСТИКА ===============
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE direction = 'incoming') as incoming_messages,
          COUNT(*) FILTER (WHERE direction = 'outgoing') as outgoing_messages,
          COUNT(*) FILTER (WHERE direction = 'incoming' AND (is_read = false OR is_read IS NULL)) as unread_messages,
          COUNT(DISTINCT contact_id) as active_contacts,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as messages_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as messages_week
        FROM messages
      `

      const result = await db.query(statsQuery)
      const stats = result.rows[0]

      res.json({
        success: true,
        data: {
          total_messages: parseInt(stats.total_messages) || 0,
          incoming_messages: parseInt(stats.incoming_messages) || 0,
          outgoing_messages: parseInt(stats.outgoing_messages) || 0,
          unread_messages: parseInt(stats.unread_messages) || 0,
          active_contacts: parseInt(stats.active_contacts) || 0,
          messages_today: parseInt(stats.messages_today) || 0,
          messages_week: parseInt(stats.messages_week) || 0
        }
      })

    } catch (error) {
      logger.error('Error getting messages stats', error)
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении статистики'
      })
    }
  }
}

export const messagesController = new MessagesController()