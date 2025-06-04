import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { db } from '@/config/database'
import { logger } from '@/utils/logger'

interface LoginRequest {
  email: string
  password: string
}

interface AuthUser {
  id: number
  email: string
  role: string
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body

    if (!email || !password) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Email и пароль обязательны'
      })
      return
    }

    const query = 'SELECT id, email, password_hash, role FROM users WHERE email = $1'
    const result = await db.query(query, [email])

    if (result.rows.length === 0) {
      logger.warn('Login attempt with non-existent email')
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Неверный email или пароль'
      })
      return
    }

    const user = result.rows[0]

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password')
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Неверный email или пароль'
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret'

    const tokenPayload: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role
    }

    // Исправляем JWT подпись
    const token = jwt.sign(tokenPayload, jwtSecret, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    } as jwt.SignOptions)

    logger.info('User logged in successfully')

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
      },
      message: 'Вход выполнен успешно'
    })

  } catch (error) {
    logger.error('Login error', error)
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    })
  }
}

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as AuthUser

    const query = 'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1'
    const result = await db.query(query, [user.id])

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        status: 'error',
        message: 'Пользователь не найден'
      })
      return
    }

    const userData = result.rows[0]

    res.json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      }
    })

  } catch (error) {
    logger.error('Get profile error', error)
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    })
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('User logged out')

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    })

  } catch (error) {
    logger.error('Logout error', error)
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    })
  }
}
