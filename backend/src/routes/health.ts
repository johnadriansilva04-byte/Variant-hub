import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as healthController from '../controllers/healthController'

const router = Router()

router.get('/all', authenticate, healthController.getAllHealthStatus)
router.get('/:type', authenticate, healthController.checkIntegrationHealth)

export default router
