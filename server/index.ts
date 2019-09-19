import Server from './common/server';
import config from './config'

let server;

if (config.env == 'development') {
	const cluster = require('cluster');
	const numCPUs = require('os').cpus().length;

	if (cluster.isMaster) {
		console.log(`Master ${process.pid} is running`);

		// Fork workers.
		for (let i = 0; i < numCPUs; i++) {
			cluster.fork();
		}

		cluster.on('exit', (worker, code, signal) => {
			console.log(`worker ${worker.process.pid} died`);
		});
	} else {
		// Workers can share any TCP connection
		// In this case it is an HTTP server
		new Server().listen(config.port);

		console.log(`Worker ${process.pid} started`);
	}

} else {
	server = new Server().listen(config.port);
}

export default server