'user strict';

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
	title: {
		type: String, 
		required: true
	},
	fullname: {
		type: String,
		required: true,
	},
	subreddit: {
		type: String,
		required: true,
	},
	author: {
		type: String, 
		required: true
	},
	author_fullname: {
		type: String, 
		required: true
	},
	link: {
		type: String, 
		required: true
	},
	type: {
		type: String, 
		required: true
	},
	contents: {
		type: String, 
		required: true
	}, 
	holder: {
		type: String
	}
});

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;