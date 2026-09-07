import { Router } from 'express'
import * as authController from '../controllers/authController'

const router = Router()

router.post('/login', authController.login)
router.post('/register', authController.register)
router.get('/profile', authController.getProfile)

export default router
