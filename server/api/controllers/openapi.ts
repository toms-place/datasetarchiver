import path from 'path';
import express from 'express';
import { OpenApiValidator } from 'express-openapi-validator';
import config from '../../config';
import errorHandler from '../../common/middlewares/error.handler';


export default function openapi(api:express.Application) {
    const dir = path.normalize(__dirname);
    const apiSpecPath = path.join(dir, '../api.yml');
    api.use(`${config.endpoint + config.OPENAPI_SPEC}`, express.static(apiSpecPath));

    new OpenApiValidator({
        apiSpecPath,
    }).install(api);

    api.use(function (err, req, res, next) {
        console.log('Error handler here');
        next(err);
      });
    
}