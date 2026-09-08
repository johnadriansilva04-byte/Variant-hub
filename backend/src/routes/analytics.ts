import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getDashboard,
  getActivity,
  getChannelAnalytics,
  getFunnel,
} from '../controllers/analyticsController'

const router = Router()

router.get('/dashboard', authenticate, getDashboard)
router.get('/activity', authenticate, getActivity)
router.get('/funnel', authenticate, getFunnel)
router.get('/channel/:type', authenticate, getChannelAnalytics)

export default router