import express from 'express';
import controller from './controllers/controller'
import {
	errorEmitter
} from './middlewares/error.handler';

const router = express.Router()

/** TODO use authentication
router.use(function auth(req, res, next) {
	console.log('auth');
	next();
});
*/

//routes
router.get('/crawlHref', controller.crawlHref)
router.get('/crawlHrefSync', controller.crawlHrefSync)
router.get('/getVersions', controller.getVersions)
router.get('/dumpLastVersions', controller.dumpLastVersions)
router.get('/getFiles', controller.getFiles)
router.get('/getFile', controller.getFile)
router.get('/file', (req, res, next) => {
	next(new Error('input a url'));
  })
router.get('/file/*', controller.getFileByUrl)
router.get('/getDatasets', controller.getDatasets)
router.get('/getDataset', controller.getDataset)
router.post('/addHref', controller.addHref)
router.post('/addManyHrefs', controller.addManyHrefs)
router.post('/crawlID', controller.crawlID)

router.use('/\*', errorEmitter);

export default router