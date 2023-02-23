'user strict';

const mongoose = require('mongoose');

const ROLES = ["user", "admin"];

const {User, Post} = require("../models/models");

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
		console.log("Database Connected");
	}

	// maybe don't?
	models() {
		return this.#models;
	}

	roles() {
		return roles;
	}

	async create_user(username, password, role=ROLES[0]) {
		let user = await User.create({
			username: username, 
			password: password, 
			role:role
		});
		await user.save();
		return user;
	}

	async get_user(username) {
		return await User.findOne({username}).catch(err => null);
	}

	async delete_user(username) {
		await User.deleteOne({username});
	}

	async get_user_list(filter={}) {
		let users = await User.find(filter,
		 {username:1, role:1}).exec().catch(err => null);
		return users;
	}

	async posts_of(username) {
		let posts = await Post.find({holder:username})
		.exec().catch(err => []);
		return posts;
	}

	async save_post(username, post) {
		let exsiting_post = await Post.findOne({
			fullname:post.fullname,
			holder: username
		});

		if (exsiting_post)
			return exsiting_post;
		
		post.holder = username;
		await post.save();
		return post;
	}

	async remove_post_from_user(user, post_fullname) {
		let post = await Post.findOne({
			fullname:post_fullname,
			holder: user
		});

		if (!post)
			throw new Error(`post "${post_fullname}" Not Found`);

		await Post.findByIdAndDelete(post._id);
	}
}

module.exports = Database;
