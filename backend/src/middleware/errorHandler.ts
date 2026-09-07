import { Request, Response, NextFunction } from 'express'

export function createError(message: string, status: number = 500) {
  const error = new Error(message) as any
  error.status = status
  return error
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err)
  
  const status = err.status || 500
  const message = err.message || 'Internal server error'
  
  res.status(status).json({
    success: false,
    error: message
  })
}
