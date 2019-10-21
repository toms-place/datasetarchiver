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

//TODO local passport!
//routes
router.get('/file', (req, res, next) => {
	next(new Error('input a url'));
})
router.get('/dataset', (req, res, next) => {
	next(new Error('input a url'));
})
router.get('/file/byDatasetID/:id', controller.getFileByDatasetID)
router.get('/file/*', controller.getFileByUrl)
router.get('/dataset/*', controller.getDatasetByUrl)

router.post('/crawlID', controller.crawlID)
router.post('/addResources', controller.addResources)

router.get('/getVersions', controller.getVersions)
router.get('/dumpLastVersions', controller.dumpLastVersions)
router.get('/getFiles', controller.getFiles)
router.get('/getFile', controller.getFile)
router.get('/getDatasets', controller.getDatasets)
router.get('/getDataset', controller.getDataset)

router.use('/\*', errorEmitter);

export default router