import { Router } from 'express'
import { body, query } from 'express-validator'
import { validateRequest } from '@/middleware/validation'
import { authenticateToken } from '@/middleware/auth'
import { botController } from '@/controllers/botController'

const router = Router()

// =============== ПУБЛИЧНЫЕ ENDPOINTS ===============

/**
 * POST /api/bot/webhook
 * Webhook для получения обновлений от Telegram
 * НЕ ТРЕБУЕТ АВТОРИЗАЦИИ - вызывается Telegram серверами
 */
router.post('/webhook', botController.handleWebhook.bind(botController))

// =============== ЗАЩИЩЕННЫЕ ENDPOINTS ===============

/**
 * GET /api/bot/test
 * Тестирование подключения к Telegram Bot API
 */
router.get('/test', authenticateToken, botController.testConnection.bind(botController))

/**
 * GET /api/bot/stats
 * Получение статистики бота
 */
router.get('/stats', authenticateToken, botController.getBotStats.bind(botController))

/**
 * POST /api/bot/webhook/set
 * Установка webhook URL
 */
router.post('/webhook/set', authenticateToken, [
  body('url')
    .isURL()
    .withMessage('Valid webhook URL is required'),
  body('secret_token')
    .optional()
    .isLength({ min: 1, max: 256 })
    .withMessage('Secret token must be between 1 and 256 characters'),
  validateRequest
], botController.setWebhook.bind(botController))

/**
 * GET /api/bot/webhook/info
 * Получение информации о текущем webhook
 */
router.get('/webhook/info', authenticateToken, botController.getWebhookInfo.bind(botController))

/**
 * POST /api/bot/message/send
 * Отправка сообщения пользователю (для админов)
 */
router.post('/message/send', authenticateToken, [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('message')
    .isLength({ min: 1, max: 4096 })
    .withMessage('Message must be between 1 and 4096 characters'),
  body('reply_markup')
    .optional()
    .isObject()
    .withMessage('Reply markup must be an object'),
  validateRequest
], botController.sendMessage.bind(botController))

// =============== CRM ИНТЕГРАЦИЯ ===============

/**
 * POST /api/bot/notify/order-created
 * Уведомление о создании заказа в CRM
 */
router.post('/notify/order-created', authenticateToken, [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  body('product_title')
    .notEmpty()
    .withMessage('Product title is required'),
  validateRequest
], botController.notifyOrderCreated.bind(botController))

/**
 * POST /api/bot/notify/status-change
 * Уведомление об изменении статуса заказа
 */
router.post('/notify/status-change', authenticateToken, [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  body('new_status')
    .notEmpty()
    .withMessage('New status is required'),
  validateRequest
], botController.notifyStatusChange.bind(botController))

/**
 * POST /api/bot/notify/order-completed
 * Уведомление о завершении заказа
 */
router.post('/notify/order-completed', authenticateToken, [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  validateRequest
], botController.notifyOrderCompleted.bind(botController))

export default router