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
const PORT = process.env.PORT || 3001

// Trust proxy (важно для rate limiting и IP detection)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Compression and parsing
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }))
}

// Rate limiting
app.use('/api/', rateLimiter)

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
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

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`)
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`)
      logger.info(`🔗 API: http://localhost:${PORT}/api`)
      logger.info(`❤️  Health: http://localhost:${PORT}/health`)
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