// backend/src/routes/telegram.ts - базовый Telegram webhook
import { Router } from 'express'

const router = Router()

/**
 * POST /api/telegram/webhook
 * Базовый webhook для Telegram (оставляем для совместимости)
 * DEPRECATED: Используйте /api/bot/webhook вместо этого
 */
router.post('/webhook', (req, res) => {
  // Перенаправляем на новый endpoint бота
  res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Use /api/bot/webhook instead.',
    redirect: '/api/bot/webhook'
  })
})

/**
 * GET /api/telegram/info
 * Информация о Telegram интеграции
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Telegram integration info',
    data: {
      webhook_endpoint: '/api/bot/webhook',
      bot_endpoints: '/api/bot/*',
      documentation: 'See /api/bot routes for full bot functionality'
    }
  })
})

export default router