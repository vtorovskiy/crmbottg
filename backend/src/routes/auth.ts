// backend/src/routes/auth.ts
import { Router } from 'express'
import { body } from 'express-validator'
import { login, getProfile, logout } from '@/controllers/auth'
import { authenticateToken } from '@/middleware/auth'
import { validateRequest } from '@/middleware/validation'

const router = Router()

// POST /api/auth/login
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  validateRequest
], login)

// GET /api/auth/profile (защищенный маршрут)
router.get('/profile', authenticateToken, getProfile)

// POST /api/auth/logout (защищенный маршрут)
router.post('/logout', authenticateToken, logout)

export default router