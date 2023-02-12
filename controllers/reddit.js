'use strict';

const axios = require("axios");
const FormData = require("form-data");
const URL = require("url");
const https = require("https");

const {Post} = require('../models/models');

const client = axios.create({
	httpsAgent: new https.Agent({  
		rejectUnauthorized: false
	})
});

class Reddit {
	#client_id;
	#secret;
	#auth_token;
	#access_token_url;
	#read_url;
	#default_headers;
	constructor(config) {
		// console.log("config:"); // debug
		// console.log(JSON.stringify(config)); // debug
		this.#client_id = config.client_id;
		this.#secret = config.secret;
		this.#access_token_url = config.access_token_url;
		this.#read_url = config.read_url;
		this.#auth_token = null;
		this.#default_headers = {
			"User-Agent" : "ProjectPortal/0.0.1", 
			"Connection" : "keep-alive"
		};
	}

	async authenticate_basic() {
		let credentials_raw = this.#client_id + ":" + this.#secret;
		let credentials = Buffer.from(credentials_raw).toString("base64");

		let form = new FormData();
		form.append("grant_type", "client_credentials");

		let headers = {
			...form.getHeaders(),
			...this.#default_headers,
			"Authorization" : `Basic ${credentials}`, 
		};

		let response = await client.post(this.#access_token_url, form, {headers});
		this.#auth_token = response.data;
		setTimeout(this.authenticate_basic, this.#auth_token.expires_in * 1000);
	}

	async read_posts(subreddit, request_data, auth_token=null) {
		console.log(`request data:`);
		console.log(request_data);

		let url = this.#read_url + `/r/${subreddit}/hot.json`;

		let listing = await this.#get_listing(url, request_data, auth_token);
		return listing;
	}

	async get_post_by_name(post_fullname, auth_token=null) {
		let url = this.#read_url += `/api/info?id=${post_fullname}`;
		let listing = await this.#get_listing(url, auth_token);
		if (listing.children.length > 0)
			return this.#post_from_data(listing.children[0]);
		return null;
	}

	async search(query, request_data, auth_token=null) {
		request_data.q = query;
		let url = this.#read_url + `/search.json`;
		let listing = await this.#get_listing(url, request_data, auth_token);
		return listing;
	}

	#post_from_data(post_data) {
		// console.log("post data:");
		// console.log(post_data);
		let type, contents;

		if (post_data.post_hint) {
			type = post_data.post_hint;
			contents = post_data.url;
		}
		else {
			type = "html";
			contents = post_data.selftext_html;
		}

		let post = new Post({
			title : post_data.title,
			fullname : post_data.name,
			subreddit: post_data.subreddit,
			author : post_data.author,
			author_fullname : post_data.author_fullname,
			link : post_data.permalink,
			type: type, 
			contents: contents
		});

		return post;
	}

	async #get_listing(url, request_data, auth_token=null, headers={}) {
		if (!auth_token && !this.#auth_token)
			throw new Error("Not Authenticated");
		if (!auth_token)
			auth_token = this.#auth_token;

		let params = new URL.URLSearchParams(request_data);
		url += `?${params}`;

		let {token_type, access_token} = auth_token;
		let all_headers = {
			...this.#default_headers,
			"Authorization": `${token_type} ${access_token}`, 
			...headers
		};

		console.log(`request to ${url}`);
		let response = await client.get(url, {headers: all_headers});
		return this.#data_from_listing(response.data);
	}

	#data_from_listing(listing) {
		let data = listing.data;
		let posts = [];

		for (let post_raw of data.children) {
			posts.push(this.#post_from_data(post_raw.data));
		}

		return {
			before: data.before,
			after: data.after,
			posts: posts
		};
	}
}

module.exports = Reddit;
