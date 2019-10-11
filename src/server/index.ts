import Server from './common/server';
import Scheduler from '../master/scheduler';
import db from './common/database';
import config from './config'

let server;

db.conn.on('connecting', () => {
	console.log(`Process ${process.pid}: Database tries to connect`)
})

db.conn.on('reconnected', () => {
	console.log(`Process ${process.pid}: Database reconnected`)
})

if (config.mode == 'scheduler') {
	db.conn.on('disconnected', () => {
		console.log(`Process ${process.pid} Error: Database connection lost`)
		Scheduler.dbFlag = false;
	})
	db.conn.on('connected', () => {
		console.log(`Process ${process.pid}: Database connection successful`)
		Scheduler.clear().then(() => {
			Scheduler.tick()
		}).catch((error) => {
			console.error(error)
		})
	})
} else {
	db.conn.on('connected', () => {
		console.log(`Process ${process.pid}: Database connection successful`)
	})

	db.conn.on('disconnected', () => {
		console.log(`Process ${process.pid} Error: Database connection lost`)
	})
}

server = new Server().listen(config.port);

export default server