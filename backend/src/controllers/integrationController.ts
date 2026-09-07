import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'

export async function listIntegrations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function getIntegration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      throw createError('Integração não encontrada', 404)
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function createIntegration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, type, config, credentials } = req.body

    if (!name || !type || !config) {
      throw createError('Campos obrigatórios: name, type, config', 400)
    }

    const { data, error } = await supabase
      .from('integrations')
      .insert({
        name,
        type,
        config,
        credentials,
        status: 'active',
        connection_status: 'unknown'
      })
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function updateIntegration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name, config, credentials, status } = req.body

    const { data, error } = await supabase
      .from('integrations')
      .update({
        name,
        config,
        credentials,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      throw createError('Integração não encontrada', 404)
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteIntegration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      success: true,
      message: 'Integração deletada com sucesso'
    })
  } catch (error) {
    next(error)
  }
}
