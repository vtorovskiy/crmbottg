import { Router } from 'express'

const router = Router()

// Временные заглушки
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Contacts endpoint' })
})

export default router
