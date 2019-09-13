import { Application } from 'express';
import crawlerRouter from './api/controllers/crawler/router'
import viewsRouter from './views/router'
import config from './config';
export default function routes(app: Application): void {
  app.use(config.endpoint + `/api/v1/`, crawlerRouter);
  app.use(config.endpoint + `/`, viewsRouter);
};
