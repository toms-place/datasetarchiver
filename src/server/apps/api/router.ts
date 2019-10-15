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
router.get('/getVersions', controller.getVersions)
router.get('/dumpLastVersions', controller.dumpLastVersions)
router.get('/getFiles', controller.getFiles)
router.get('/getFile', controller.getFile)
router.get('/file', (req, res, next) => {
	next(new Error('input a url'));
})
router.get('/file/byDatasetID/:id', controller.getFileByDatasetID)
router.get('/file/*', controller.getFileByUrl)
router.get('/getDatasets', controller.getDatasets)
router.get('/getDataset', controller.getDataset)
//router.get('/add/url/*', controller.addUrl)
router.post('/addResources', controller.addResources)
//router.get('/add/:', controller.addResources)
router.post('/addHref', controller.addHref)
router.post('/addManyHrefs', controller.addManyHrefs)
router.post('/crawlID', controller.crawlID)

router.use('/\*', errorEmitter);

export default router