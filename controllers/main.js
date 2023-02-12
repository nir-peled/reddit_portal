'use strict';

const Listener = require('./listener');
const Database = require('./database');
const Authenticator = require('./authenticator');
const Reddit = require('./reddit');
const config = require('../configs/server.config');

class Server {
	#listener;
	#database;
	#authenticator;
	#reddit;
	constructor(config) {
		this.#database = new Database(config.database_url);
		this.#authenticator = new Authenticator(this.#database);
		this.#listener = new Listener(this, config.listener);
		this.#reddit = new Reddit(config.reddit);
	}

	async start() {
		await this.#database.connect();
		await this.#reddit.authenticate_basic();
		this.#listener.start();
	}

	database() {
		return this.#database;
	}

	authenticator() {
		return this.#authenticator;
	}

	reddit () {
		return this.#reddit;
	}

	create_authenticator() {
		this.#authenticator = new Authenticator(this.#database);
	}
}

var server = new Server(config);
server.start();
