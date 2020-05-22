import {Router} from 'express'
import controller from '../controllers/master.controller'
import sourceController from '../controllers/source.controller'
import bulkController from '../controllers/bulk.controller'
import sparqlController from '../controllers/sparql.controller'

const router = Router()

//routes
router.get('/stop', controller.stop)
router.get('/start', controller.start)
router.get('/clear', controller.clear)


//bulk-source
router.get('/bulk-source', sourceController.start)
router.get('/bulk-source-status', sourceController.status)
router.get('/bulk-source-stop', sourceController.stop)
router.get('/bulk-source-continue', sourceController.continue)

//bulk-add
router.get('/bulk', bulkController.start)
router.get('/bulk-status', bulkController.status)
router.get('/bulk-stop', bulkController.stop)
router.get('/bulk-continue', bulkController.continue)

//sparql-start
router.get('/start-sparql', sparqlController.start)

export default router