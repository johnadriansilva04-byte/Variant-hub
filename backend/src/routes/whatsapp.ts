import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as whatsappController from '../controllers/whatsappController'
import * as whatsappWebhookController from '../controllers/whatsappWebhookController'

const router = Router()

router.get('/config', authenticate, whatsappController.getWhatsAppConfig)
router.post('/config', authenticate, whatsappController.saveWhatsAppConfig)
router.post('/status', authenticate, whatsappController.getWhatsAppStatus)
router.post('/conversations', authenticate, whatsappController.getWhatsAppConversations)
router.post('/messages/:jid', authenticate, whatsappController.getWhatsAppMessages)
router.post('/send', authenticate, whatsappController.sendWhatsAppMessage)
router.post('/webhook', whatsappWebhookController.receiveWhatsAppWebhook)
router.post('/sync', authenticate, whatsappWebhookController.syncWhatsAppMessages)

export default router
