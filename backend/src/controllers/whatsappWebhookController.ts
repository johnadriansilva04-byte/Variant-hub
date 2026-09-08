import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { processWebhookEvent } from '../services/whatsappSyncService'

// ─────────────────────────────────────────────────────────────
// Webhook da Evolution API — tempo real.
// Cada evento passa pelo processWebhookEvent do SyncService,
// que deduplica por message_id e atualiza só a conversa afetada.
// ─────────────────────────────────────────────────────────────

export async function receiveWhatsAppWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = req.body || {}
    const events = Array.isArray(body) ? body : Array.isArray(body.events) ? body.events : [body]

    let savedCount = 0
    for (const event of events) {
      if (event.event === 'connection.update' || event.event === 'qrcode.updated' || event.event === 'presence.update') {
        continue
      }
      const result = await processWebhookEvent(event)
      if (result.saved) savedCount++
    }

    res.json({ success: true, saved: savedCount })
  } catch (error) {
    next(error)
  }
}

export async function syncWhatsAppMessages(req: AuthRequest, res: Response, next: NextFunction) {
  // Mantido como alias compatível: agora o sync real é o incremental do SyncService
  try {
    const { incrementalSync } = await import('../services/whatsappSyncService')
    const result = await incrementalSync(req.body?.config || req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}