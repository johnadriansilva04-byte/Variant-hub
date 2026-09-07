import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      throw createError('Telefone e senha são obrigatórios', 400)
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
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
        phone: data.phone,
        role: data.role
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { password, name, phone } = req.body

    if (!password || !name || !phone) {
      throw createError('Senha, nome e telefone são obrigatórios', 400)
    }

    // Generate fake email for Supabase auth
    const fakeEmail = `${phone.replace(/\D/g, '')}@variant.app`

    // Check if phone already exists
    const { data: existingPhone } = await supabase
      .from('users')
      .select('phone')
      .eq('phone', phone)
      .single()

    if (existingPhone) {
      throw createError('Telefone já cadastrado', 400)
    }

    // Create user (in production, hash password)
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: fakeEmail,
        password_hash: password, // In production: hash password
        name,
        phone,
        role: 'user',
        status: 'active'
      })
      .select()
      .single()

    if (error || !data) {
      throw createError('Erro ao criar usuário', 500)
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
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
