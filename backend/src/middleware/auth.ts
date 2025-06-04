import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret'

    const decoded = jwt.verify(token, jwtSecret) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    }

    logger.debug('User authenticated')

    next()
  } catch (error) {
    logger.warn('Authentication failed')

    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Invalid or expired token'
    })
  }
}

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
