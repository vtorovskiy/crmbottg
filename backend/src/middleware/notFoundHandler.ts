import { Request, Response } from 'express'
import { logger } from '@/utils/logger'

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
