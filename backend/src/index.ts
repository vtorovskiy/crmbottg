// backend/src/index.ts - исправленная версия
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'

import { errorHandler } from '@/middleware/errorHandler'
import { notFoundHandler } from '@/middleware/notFoundHandler'
import { rateLimiter } from '@/middleware/rateLimiter'
import { logger } from '@/utils/logger'
import { connectDatabase } from '@/config/database'

// Import routes
import authRoutes from '@/routes/auth'
import contactRoutes from '@/routes/contacts'
import dealRoutes from '@/routes/deals'
import messageRoutes from '@/routes/messages'
import fileRoutes from '@/routes/files'
import telegramRoutes from '@/routes/telegram'
import settingsRoutes from '@/routes/settings'
import statsRoutes from '@/routes/stats'

// Load environment variables
dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3001') // FIX: Приводим к числу

// Trust proxy (важно для rate limiting и IP detection)
app.set('trust proxy', 1)

// ИСПРАВЛЕННЫЕ CORS настройки
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) return callback(null, true)

    // Список разрешенных origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://193.233.103.164:3000',  // Ваш сервер
      'http://193.233.103.164',
      ...(process.env.CORS_ORIGIN?.split(',') || [])
    ]

    // В development разрешаем все localhost и 127.0.0.1
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true)
      }
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // FIX: Исправляем logger.warn с правильными параметрами
      logger.warn('CORS blocked request from origin', { origin })
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400, // 24 hours
}

app.use(cors(corsOptions))

// Добавляем preflight для всех routes
app.options('*', cors(corsOptions))

// Security middleware (обновленный для развития)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"],
    },
  } : false, // Отключаем CSP в development
}))

// Compression and parsing
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Логирование запросов (улучшенное)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }))

  // Дополнительное логирование для отладки CORS
  app.use((req, res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      authorization: req.get('Authorization') ? 'Bearer ***' : 'none'
    })
    next()
  })
}

// Rate limiting (исключаем префлайт запросы)
app.use('/api/', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next()
  }
  return rateLimiter(req, res, next)
})

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint (расширенный)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    cors: {
      origin: req.get('Origin') || 'none',
      allowed: true
    }
  })
})

// Test endpoint для проверки CORS
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/deals', dealRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/stats', statsRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown handling
let server: any;

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`)

  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()
    logger.info('Database connected successfully')

    // FIX: Правильно задаем типы для app.listen
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`)
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`)
      logger.info(`🔗 API: http://localhost:${PORT}/api`)
      logger.info(`❤️  Health: http://localhost:${PORT}/health`)
      logger.info(`🌐 CORS enabled for development`)
    })

    // Setup graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    return server
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export default app