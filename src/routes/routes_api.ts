

import express, {Router} from 'express'
import controller from '../controllers/controller'
import statsController from '../controllers/app.controller'
import apiController from '../controllers/api.controller'
import path from 'path'

const router = Router()

/** TODO use authentication
router.use(function auth(req, res, next) {
	console.log('auth');
	next();
});
*/

//TODO local passport!


router.get('/get/file/:by/*', controller.file)
//router.get('/get/file/*', controller.file)
router.get('/get/dataset/:by/*', controller.dataset)
router.get('/get/datasets/:hostname', controller.getDatasetsByHostname)

//TODO make functional use next()
router.get('/get/datasets/:by/*', apiController.getDatasets)

router.post('/get/files', apiController.getFilesByArray)
router.get('/get/files/sparql', apiController.getFilesBySparql)
router.get('/get/files/:by/*', apiController.getFiles)


router.get('/get/file/*', controller.file)
router.get('/get/dataset/*', controller.dataset)

//legacy
router.get('/dataset/*', controller.getDatasetByUrl)
router.get('/file/*', controller.file)

//TODO enhance
router.post('/post/resource', controller.addResources)
router.post('/post/resources', controller.addResources)
//depricate legacy
router.post('/addResources', controller.addResources)


//stats
router.get('/stats/datasetCountPerHost', statsController.getDatasetCountPerHost)
router.get('/stats/basic', statsController.getBasicStats)
router.get('/stats/fileTypeDistribution', statsController.getFiletypeDistribution)




//deprication legacy
router.get('/getVersions', controller.getVersions)
router.get('/getFiles', apiController.getFiles)
router.get('/getFile', controller.getFile)
router.get('/getDatasets', apiController.getDatasets)
router.get('/getDataset', controller.getDataset)

//TODO rename! maybe privat or secret
router.post('/crawl', controller.crawl)

router.use('/spec', express.static(path.resolve('./public/api.yml')))

router.use('/*', (req, res, next) => {
	next(new Error('not yet implemented'))
})

export default router