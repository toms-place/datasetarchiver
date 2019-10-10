import pino from 'pino';
import config from '../config'
const l = pino({
  name: config.APP_ID,
  level: config.LOG_LEVEL
});

export default l;
