'use strict';

const Listener = require('./listener')

class Server {
	#listener;
	constructor(uri, port, database_uri) {
		this.#listener = new Listener(this, uri, port);
		// #database = new Database(this, database_uri);
	}

	start() {
		this.#listener.start();
	}
}

var server = new Server("127.0.0.1", 8081, 'mongodb://127.0.0.1:27017');
server.start();
