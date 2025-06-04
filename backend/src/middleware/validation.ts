import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { logger } from '@/utils/logger'

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
        field: err.type === 'field' ? (err as any).path : err.type,
        message: err.msg,
        value: err.type === 'field' ? (err as any).value : undefined
      }))
    })
    return
  }

  next()
}
