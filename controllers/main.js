'use strict';

const Listener = require('./listener');
const Database = require('./database');
const Authenticator = require('./authenticator');
const config = require('../configs/server.config');

class Server {
	#listener;
	#database;
	#authenticator;
	constructor(config) {
		this.#database = new Database(config.database_url);
		this.#listener = new Listener(this, config.uri, config.port);
		this.#authenticator = null;
	}

	async start() {
		await this.#database.connect()
		this.#authenticator = new Authenticator(this.#database);
		this.#listener.start();
	}

	database() {
		return this.#database;
	}

	authenticator() {
		return this.#authenticator;
	}

	create_authenticator() {
		this.#authenticator = new Authenticator(this.#database);
	}
}

var server = new Server(config);
server.start();
