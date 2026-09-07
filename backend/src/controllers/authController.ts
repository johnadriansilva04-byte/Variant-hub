import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw createError('Email e senha são obrigatórios', 400)
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      throw createError('Credenciais inválidas', 401)
    }

    // In production, verify password hash
    // For now, just return user data
    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // In production, get user from JWT token
    // For now, return mock data
    res.json({
      success: true,
      data: {
        id: 'mock-user-id',
        email: 'user@example.com',
        name: 'Usuário',
        role: 'user'
      }
    })
  } catch (error) {
    next(error)
  }
}
