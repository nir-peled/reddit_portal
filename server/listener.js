'use strict';

const express = require('express');
const cors = require("cors");

class Listener {
	#server;
	#uri;
	#port;
	#app;
	constructor(server, uri, port) {
		this.#server = server;
		this.#uri = uri;
		this.#port = port;
		this.#app = express();
		this.#setup_app();
	}

	#setup_app() {
		this.#app.use( cors({origin: this.full_url()}) );
		this.#app.use(express.static("../views"));
		this.#app.use( express.urlencoded({ extended: true }) );
		this.#app.use(express.json());
		this.#app.get("/", (reqquest, response) => {
			// TODO: handle auto
			response.json({message: "nothing here yet"});
		});
	}

	start() {
		this.#app.listen(this.#port, () => {
			console.log(`server listening on ${this.full_url()}`);
		})
	}

	full_url() {
		return "http://" + this.#uri + ":" + this.#port;
	}
}

module.exports = Listener;
