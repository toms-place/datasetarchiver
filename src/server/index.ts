import Server from './common/server';
import Scheduler from '../master/scheduler';
import db from './common/database';
import config from './config'

let server;

if (config.mode == 'scheduler') {
	db.conn.on('disconnected', () => {
		console.log(`Process ${process.pid} Error: Database connection lost`)
		Scheduler.dbFlag = false;
	})
	db.conn.on('connected', () => {
		Scheduler.clear().then(() => {
			Scheduler.tick()
		}).catch((error) => {
			console.error(error)
		})
	})
}

server = new Server().listen(config.port);

export default server