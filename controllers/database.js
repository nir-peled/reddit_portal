'user strict';

const mongoose = require('mongoose');

class Database {
	#models;
	#url;
	constructor(url) {
		this.#url = url;
	}

	async connect() {
		await mongoose.connect(this.#url, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("Database Connected")
		this.#models = require("../models/models");
	}

	models() {
		return this.#models;
	}
}

module.exports = Database;
