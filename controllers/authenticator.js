'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const jwtSecret = '5189fdfa918c60cb96a1937501e0dc9ae71c28ceb92ea277ec6784d7cd4abe1182bd34';

// the User model
var User;

class Authenticator {
	#database;
	#pass_min_length;
	#salt_rounds;
	#default_role;
	#max_age_sec;
	constructor(database, config = {}) {
		let default_config = {
			pass_min_length: 6, 
			salt_rounds: 10, 
			max_age_sec: 3 * 60 * 60, // 3 hours
			default_role: "basic"
		}
		config = {...default_config, ...config}

		this.#database = database;
		this.#pass_min_length = config.pass_min_length;
		this.#salt_rounds = config.salt_rounds;
		this.#default_role = config.default_role;
		this.#max_age_sec = config.max_age_sec;

		User = database.models().User;
	}

	async register(username, password, role=this.#default_role) {
		if (!username || !password)
			throw new Error("empty parameters");
		if (password.length < this.#pass_min_length)
			throw new Error(`short password`);
		let user = await this.#get_user(username);
		if (user !== null)
			throw new Error("username used");

		let hashed_pass = await bcrypt.hash(password, this.#salt_rounds);
		user = User.create({
			username:username, 
			password:hashed_pass, 
			role:role
		});

		// await user.save();
		return user;
	}

	async login(username, password) {
		if (!username || !password)
			throw new Error("missing parameters");

		let user = await this.#get_user(username);
		if (!user) 
			throw new Error("user not found");

		let compare_result = await bcrypt.compare(password, user.password);
		if (compare_result)
		{
			let token = await this.#create_token(user);
			return {user: user, token: token};
		}
		throw new Error("user not matching");
	}

	async verify(token) {
		let decoded_token = await jwt.verify(token, jwtSecret);
		return decoded_token;
	}

	async #create_token(user) {
		let token = await jwt.sign({
			id: user._id,
			username: user.username,
			role: user.role
		}, jwtSecret, {expiresIn: this.#max_age_sec});

		return token;
	}

	async #get_user(username) {
		// let filter = {}
		// filter["username"] = username;
		let user = await User.findOne({username}).catch(err=> null);
		return user;
	}

	max_age_sec() {
		return this.#max_age_sec;
	}
}

module.exports = Authenticator;
