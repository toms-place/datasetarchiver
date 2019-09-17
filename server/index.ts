import Server from './common/server';
import config from './config'

export default new Server().listen(config.port);
