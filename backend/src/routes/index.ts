import { Router } from 'express'
import authRoutes from './auth'
import integrationRoutes from './integrations'
import healthRoutes from './health'
import whatsappRoutes from './whatsapp'

const router = Router()

router.use('/auth', authRoutes)
router.use('/integrations', integrationRoutes)
router.use('/health', healthRoutes)
router.use('/whatsapp', whatsappRoutes)

export default router
