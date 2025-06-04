// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

interface AppError extends Error {
  statusCode?: number
  status?: string
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'
  let status = err.status || 'error'

  // Log error details
  logger.error('API Error', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
    userId: (req as any).user?.id
  })

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // PostgreSQL errors
  if (err.name === 'DatabaseError') {
    statusCode = 500
    message = 'Database error'

    // Don't expose database details in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error'
    }
  }

  // Rate limit errors
  if (statusCode === 429) {
    message = 'Too many requests. Please try again later.'
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    status,
    message,
    timestamp: new Date().toISOString(),
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack
    errorResponse.details = err
  }

  res.status(statusCode).json(errorResponse)
}

// backend/src/middleware/notFoundHandler.ts
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  })

  res.status(404).json({
    success: false,
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  })
}

// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    })

    res.status(429).json({
      success: false,
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
    })
  },
  // Более мягкие лимиты для webhook от Telegram
  skip: (req) => {
    return req.path === '/api/telegram/webhook'
  }
})

// Специальный rate limiter для Telegram webhook
export const telegramRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 1000, // высокий лимит для webhook
  message: 'Telegram webhook rate limit exceeded',
  standardHeaders: false,
  legacyHeaders: false,
})

// backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    role: string
  }
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null

    if (!token) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Access token required'
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as any

    // Here you would typically fetch user from database
    // For now, just attach the decoded payload
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    }

    logger.debug('User authenticated', {
      userId: decoded.id,
      email: decoded.email,
      route: req.originalUrl
    })

    next()
  } catch (error) {
    logger.warn('Authentication failed', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      route: req.originalUrl
    })

    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Invalid or expired token'
    })
  }
}

// Middleware для проверки роли администратора
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Authentication required'
    })
    return
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      status: 'error',
      message: 'Admin access required'
    })
    return
  }

  next()
}

// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    })

    res.status(400).json({
      success: false,
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : err.type,
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined
      }))
    })
    return
  }

  next()
}