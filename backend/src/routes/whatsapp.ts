import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as whatsappController from '../controllers/whatsappController'

const router = Router()

router.post('/status', authenticate, whatsappController.getWhatsAppStatus)
router.post('/conversations', authenticate, whatsappController.getWhatsAppConversations)
router.post('/messages/:jid', authenticate, whatsappController.getWhatsAppMessages)
router.post('/send', authenticate, whatsappController.sendWhatsAppMessage)

export default router
