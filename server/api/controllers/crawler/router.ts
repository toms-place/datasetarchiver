import express from 'express';
import controller from './controller'
export default express.Router()
    .get('/addHref', controller.addHref)
    .get('/addManyHrefs', controller.addManyHrefs)
    .get('/crawlHref', controller.crawlHref)
    .get('/crawlHrefSync', controller.crawlHrefSync)
    .get('/crawlID', controller.crawlID)