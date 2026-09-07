import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'
import { evolutionApiService } from '../services/evolutionApi'

export async function checkIntegrationHealth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type } = req.params
    
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('type', type)
      .single()
    
    if (error || !integration) {
      return res.json({ 
        success: true, 
        data: { status: 'not_configured' } 
      })
    }
    
    let healthStatus = 'offline'
    let errorMessage = null
    
    switch (type) {
      case 'whatsapp':
        try {
          if (integration.config && integration.config.apiUrl && integration.config.apiKey && integration.config.instanceName) {
            evolutionApiService.configure({
              apiUrl: integration.config.apiUrl,
              apiKey: integration.config.apiKey,
              instanceName: integration.config.instanceName
            })
            
            const status = await evolutionApiService.getInstanceStatus()
            healthStatus = status.state === 'open' ? 'online' : 'offline'
          } else {
            healthStatus = 'offline'
            errorMessage = 'Configuração incompleta'
          }
        } catch (e: any) {
          healthStatus = 'offline'
          errorMessage = e.message || 'Erro ao conectar com Evolution API'
        }
        break
      
      case 'instagram':
      case 'facebook':
        healthStatus = integration.status === 'active' ? 'online' : 'offline'
        break
      
      case 'telegram':
        healthStatus = integration.status === 'active' ? 'online' : 'offline'
        break
      
      case 'tiktok':
        healthStatus = integration.status === 'active' ? 'online' : 'offline'
        break
      
      default:
        healthStatus = 'offline'
    }
    
    await supabase
      .from('integrations')
      .update({
        connection_status: healthStatus,
        last_check: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', integration.id)
    
    res.json({ 
      success: true, 
      data: { 
        status: healthStatus,
        last_check: new Date().toISOString(),
        error: errorMessage
      } 
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllHealthStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { data: integrations } = await supabase
      .from('integrations')
      .select('type, connection_status, last_check, error_message')
    
    const statusMap: Record<string, any> = {
      whatsapp: { status: 'not_configured' },
      instagram: { status: 'not_configured' },
      facebook: { status: 'not_configured' },
      telegram: { status: 'not_configured' },
      tiktok: { status: 'not_configured' }
    }
    
    if (integrations) {
      integrations.forEach((integration: any) => {
        statusMap[integration.type] = {
          status: integration.connection_status || 'offline',
          last_check: integration.last_check,
          error: integration.error_message
        }
      })
    }
    
    res.json({ 
      success: true, 
      data: statusMap 
    })
  } catch (error) {
    next(error)
  }
}
