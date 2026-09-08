import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as whatsappController from '../controllers/whatsappController'
import * as whatsappWebhookController from '../controllers/whatsappWebhookController'

const router = Router()

// Config / status
router.get('/config', authenticate, whatsappController.getWhatsAppConfig)
router.post('/config', authenticate, whatsappController.saveWhatsAppConfig)
router.post('/status', authenticate, whatsappController.getWhatsAppStatus)

// Conversas e mensagens
router.post('/conversations', authenticate, whatsappController.getWhatsAppConversations)
router.post('/messages/:jid', authenticate, whatsappController.getWhatsAppMessages)
router.get('/contacts/:jid', authenticate, whatsappController.getWhatsAppContact)

// Envio
router.post('/send', authenticate, whatsappController.sendWhatsAppMessage)

// Sync (full no login/página; incremental a cada 10s)
router.post('/sync', authenticate, whatsappController.runIncrementalSync)
router.post('/sync/full', authenticate, whatsappController.runFullSync)
router.post('/sync/incremental', authenticate, whatsappController.runIncrementalSync)

// Mídia (sem auth: <img>/<audio>/<video> não enviam header de autorização)
router.get('/media/:jid/:messageId', whatsappController.getMedia)

// Webhook (tempo real, sem auth — chamado pela Evolution)
router.post('/webhook', whatsappWebhookController.receiveWhatsAppWebhook)

export default router