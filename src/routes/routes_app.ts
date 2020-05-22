import express, {
	Router
} from 'express'
import path from 'path'
import statsController from '../controllers/app.controller'
import controller from '../controllers/app.controller'
import {absolutePath as getSwaggerAbsolutePath} from 'swagger-ui-dist'

const router = Router()

router.use('/stats', controller.stats)
router.use('/api-explorer', controller.explorer)
router.use('/public', express.static(path.resolve('./public')))
router.use('/swagger', express.static(getSwaggerAbsolutePath()))
router.use('/slides', statsController.slides)
router.use('/client', function (req, res) {
	res.sendFile(path.resolve('./client/index.html'))
})
router.use('/', controller.index)

export default router