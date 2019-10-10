import express from 'express';
import controller from './controllers/controller'
import {
	errorEmitter
} from './middlewares/error.handler';

const router = express.Router()

//routes
router.get('/stop', controller.stop)
router.get('/start', controller.start)
router.use('/\*', errorEmitter);

export default router