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

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, name, phone } = req.body

    if (!email || !password || !name || !phone) {
      throw createError('Email, senha, nome e telefone são obrigatórios', 400)
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingEmail) {
      throw createError('Email já cadastrado', 400)
    }

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
        email,
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
