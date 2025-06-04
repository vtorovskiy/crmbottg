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
    
    if (process.env['NODE_ENV'] === 'production') {
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
  if (process.env['NODE_ENV'] === 'development') {
    errorResponse.stack = err.stack
    errorResponse.details = err
  }

  res.status(statusCode).json(errorResponse)
}
