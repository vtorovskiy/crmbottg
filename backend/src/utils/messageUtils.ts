// backend/src/utils/messageUtils.ts
import { db } from '@/config/database'
import { logger } from '@/utils/logger'
import type { TelegramMessage } from '@/types/telegram'

// Функция для сохранения сообщения в CRM
export async function saveMessageToCRM(
  telegramMessage: TelegramMessage,
  contactId: number,
  direction: 'incoming' | 'outgoing'
): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO messages (
        contact_id,
        telegram_message_id,
        content,
        type,
        direction,
        file_path,
        file_name,
        file_size,
        metadata,
        is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `

    // Определяем тип сообщения
    const messageType = telegramMessage.photo ? 'photo' :
                       telegramMessage.video ? 'video' :
                       telegramMessage.audio ? 'audio' :
                       telegramMessage.voice ? 'voice' :
                       telegramMessage.document ? 'document' :
                       telegramMessage.sticker ? 'sticker' : 'text'

    // Получаем текст сообщения (с проверкой типов)
    const content = telegramMessage.text ||
                   (telegramMessage as any).caption ||
                   `[${messageType.toUpperCase()}]`

    // Инициализируем переменные файла
    let filePath: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null
    let metadata: Record<string, any> | null = null

    // Обрабатываем файлы
    if (telegramMessage.document) {
      fileName = telegramMessage.document.file_name || null
      fileSize = telegramMessage.document.file_size || null
      metadata = {
        mime_type: telegramMessage.document.mime_type || null
      }
    } else if (telegramMessage.photo && telegramMessage.photo.length > 0) {
      const photo = telegramMessage.photo[telegramMessage.photo.length - 1]
      fileSize = photo.file_size || null
      metadata = {
        width: photo.width,
        height: photo.height
      }
    } else if (telegramMessage.video) {
      fileName = telegramMessage.video.file_name || null
      fileSize = telegramMessage.video.file_size || null
      metadata = {
        width: telegramMessage.video.width,
        height: telegramMessage.video.height,
        duration: telegramMessage.video.duration,
        mime_type: telegramMessage.video.mime_type || null
      }
    } else if (telegramMessage.audio) {
      fileName = telegramMessage.audio.file_name || null
      fileSize = telegramMessage.audio.file_size || null
      metadata = {
        duration: telegramMessage.audio.duration,
        performer: telegramMessage.audio.performer || null,
        title: telegramMessage.audio.title || null,
        mime_type: telegramMessage.audio.mime_type || null
      }
    } else if (telegramMessage.voice) {
      fileSize = telegramMessage.voice.file_size || null
      metadata = {
        duration: telegramMessage.voice.duration,
        mime_type: telegramMessage.voice.mime_type || null
      }
    }

    await db.query(insertQuery, [
      contactId,
      telegramMessage.message_id,
      content,
      messageType,
      direction,
      filePath,
      fileName,
      fileSize,
      metadata ? JSON.stringify(metadata) : null,
      direction === 'incoming' ? false : true // входящие не прочитаны, исходящие прочитаны
    ])

    logger.debug('Message saved to CRM', {
      contactId,
      messageId: telegramMessage.message_id,
      type: messageType,
      direction,
      hasFile: !!fileName
    })

  } catch (error) {
    logger.error('Error saving message to CRM', error, {
      contactId,
      messageId: telegramMessage.message_id,
      direction
    })
  }
}

// Функция для автоматического создания контакта
export async function ensureContactExists(telegramUser: any): Promise<number> {
  try {
    // Используем функцию из БД для создания/получения контакта
    const result = await db.query(
      'SELECT create_contact_from_telegram($1, $2, $3, $4) as contact_id',
      [
        telegramUser.id.toString(),
        telegramUser.username || null,
        telegramUser.first_name || null,
        telegramUser.last_name || null
      ]
    )

    const contactId = result.rows[0].contact_id

    logger.debug('Contact ensured', {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      contactId,
      created: !result.rows[0].existed // если функция вернет existed флаг
    })

    return contactId
  } catch (error) {
    logger.error('Error ensuring contact exists', error, {
      telegramId: telegramUser.id,
      username: telegramUser.username
    })
    throw error
  }
}

// Вспомогательная функция для создания fake сообщения для исходящих
export function createOutgoingMessage(
  messageId: number,
  text: string,
  chatId: number | string
): TelegramMessage {
  return {
    message_id: messageId,
    text: text,
    from: {
      id: 0,
      is_bot: true,
      first_name: 'CRM Bot',
      username: 'crm_bot'
    },
    chat: {
      id: typeof chatId === 'string' ? parseInt(chatId) : chatId,
      type: 'private'
    },
    date: Math.floor(Date.now() / 1000)
  } as TelegramMessage
}