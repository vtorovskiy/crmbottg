// backend/src/routes/bot.ts
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
 * Не требует аутентификации - вызывается Telegram серверами
 */
router.post('/webhook', botController.handleWebhook.bind(botController))

// =============== ЗАЩИЩЕННЫЕ ENDPOINTS ===============

// Middleware для всех остальных маршрутов
router.use(authenticateToken)

/**
 * GET /api/bot/test
 * Тестирование подключения к Telegram Bot API
 */
router.get('/test', botController.testConnection.bind(botController))

/**
 * GET /api/bot/stats
 * Получение статистики бота
 */
router.get('/stats', botController.getBotStats.bind(botController))

/**
 * POST /api/bot/webhook/set
 * Установка webhook URL
 */
router.post('/webhook/set', [
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
router.get('/webhook/info', botController.getWebhookInfo.bind(botController))

/**
 * POST /api/bot/message/send
 * Отправка сообщения пользователю (для админов)
 */
router.post('/message/send', [
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
 * Вызывается из CRM системы при создании новой сделки
 */
router.post('/notify/order-created', [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  body('product_title')
    .notEmpty()
    .withMessage('Product title is required'),
  body('size')
    .optional()
    .isString()
    .withMessage('Size must be a string'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('delivery_type')
    .optional()
    .isIn(['standard', 'express'])
    .withMessage('Delivery type must be standard or express'),
  body('manager_name')
    .optional()
    .isString()
    .withMessage('Manager name must be a string'),
  body('manager_username')
    .optional()
    .isString()
    .withMessage('Manager username must be a string'),
  validateRequest
], botController.notifyOrderCreated.bind(botController))

/**
 * POST /api/bot/notify/status-change
 * Уведомление об изменении статуса заказа
 * Вызывается из CRM при изменении статуса сделки
 */
router.post('/notify/status-change', [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  body('new_status')
    .notEmpty()
    .withMessage('New status is required'),
  body('old_status')
    .optional()
    .isString()
    .withMessage('Old status must be a string'),
  body('track_number')
    .optional()
    .isString()
    .withMessage('Track number must be a string'),
  validateRequest
], botController.notifyStatusChange.bind(botController))

/**
 * POST /api/bot/notify/order-completed
 * Уведомление о завершении заказа
 * Вызывается из CRM при завершении сделки
 */
router.post('/notify/order-completed', [
  body('telegram_id')
    .notEmpty()
    .withMessage('Telegram ID is required'),
  body('order_number')
    .notEmpty()
    .withMessage('Order number is required'),
  body('product_title')
    .optional()
    .isString()
    .withMessage('Product title must be a string'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('review_url')
    .optional()
    .isURL()
    .withMessage('Review URL must be a valid URL'),
  validateRequest
], botController.notifyOrderCompleted.bind(botController))

export default router