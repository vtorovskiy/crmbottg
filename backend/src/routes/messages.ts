// backend/src/routes/messages.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { validateRequest } from '@/middleware/validation'
import { authenticateToken } from '@/middleware/auth'
import { messagesController } from '@/controllers/messagesController'

const router = Router()

// Все маршруты требуют авторизации
router.use(authenticateToken)

/**
 * GET /api/messages/contacts
 * Получить список контактов с последними сообщениями
 */
router.get('/contacts', [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Поисковый запрос должен быть от 1 до 100 символов'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть от 1 до 100'),
  validateRequest
], messagesController.getContactsList.bind(messagesController))

/**
 * GET /api/messages/:contactId
 * Получить историю сообщений с контактом
 */
router.get('/:contactId', [
  param('contactId')
    .isInt({ min: 1 })
    .withMessage('ID контакта должен быть положительным числом'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Номер страницы должен быть положительным числом'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть от 1 до 100'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Поисковый запрос должен быть от 1 до 100 символов'),
  validateRequest
], messagesController.getMessageHistory.bind(messagesController))

/**
 * POST /api/messages/send
 * Отправить сообщение контакту
 */
router.post('/send', [
  body('contactId')
    .isInt({ min: 1 })
    .withMessage('ID контакта обязателен и должен быть положительным числом'),
  body('content')
    .isLength({ min: 1, max: 4096 })
    .withMessage('Содержимое сообщения должно быть от 1 до 4096 символов'),
  body('type')
    .optional()
    .isIn(['text', 'photo', 'video', 'audio', 'voice', 'document', 'sticker'])
    .withMessage('Неверный тип сообщения'),
  validateRequest
], messagesController.sendMessage.bind(messagesController))

/**
 * DELETE /api/messages/:id
 * Удалить сообщение
 */
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID сообщения должен быть положительным числом'),
  validateRequest
], messagesController.deleteMessage.bind(messagesController))

/**
 * POST /api/messages/:contactId/mark-read
 * Пометить сообщения как прочитанные
 */
router.post('/:contactId/mark-read', [
  param('contactId')
    .isInt({ min: 1 })
    .withMessage('ID контакта должен быть положительным числом'),
  validateRequest
], messagesController.markAsRead.bind(messagesController))

/**
 * GET /api/messages/search
 * Поиск по сообщениям
 */
router.get('/search', [
  query('q')
    .isLength({ min: 1, max: 100 })
    .withMessage('Поисковый запрос обязателен и должен быть от 1 до 100 символов'),
  query('contact')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID контакта должен быть положительным числом'),
  query('type')
    .optional()
    .isIn(['text', 'photo', 'video', 'audio', 'voice', 'document', 'sticker'])
    .withMessage('Неверный тип сообщения'),
  query('direction')
    .optional()
    .isIn(['incoming', 'outgoing'])
    .withMessage('Направление должно быть incoming или outgoing'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть от 1 до 100'),
  validateRequest
], async (req, res) => {
  // TODO: Реализовать поиск по сообщениям
  res.json({
    success: true,
    data: {
      query: req.query.q,
      results: [],
      total: 0
    },
    message: 'Поиск в разработке'
  })
})

/**
 * GET /api/messages/stats
 * Статистика по сообщениям
 */
router.get('/stats', messagesController.getStats.bind(messagesController))

export default router