import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  userId?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  // Simplified auth - in production, verify JWT token
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    })
  }
  
  // For now, just pass through
  // In production, verify JWT and set req.userId
  next()
}
