import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as integrationController from '../controllers/integrationController'

const router = Router()

router.get('/', authenticate, integrationController.listIntegrations)
router.get('/:id', authenticate, integrationController.getIntegration)
router.post('/', authenticate, integrationController.createIntegration)
router.put('/:id', authenticate, integrationController.updateIntegration)
router.delete('/:id', authenticate, integrationController.deleteIntegration)

export default router
