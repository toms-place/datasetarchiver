import api_routes from './routes/routes_api'
import app_routes from './routes/routes_app'
import master_routes from './routes/routes_master'
import {Router} from 'express'
import cf from './config'

const router = Router()

router.use('/api/v1', api_routes)
if (cf.MASTER) router.use(master_routes)
router.use(app_routes)

export default router