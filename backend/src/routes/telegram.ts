import { Router } from 'express'

const router = Router()

router.post('/webhook', (req, res) => {
  res.json({ success: true, message: 'Telegram webhook endpoint' })
})

export default router
