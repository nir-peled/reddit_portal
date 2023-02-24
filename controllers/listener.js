'use strict';

const express = require('express');
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const SessionManager = require("./session_manager");

const OK = 200;
const UNAUTHORIZED = 406;
const BAD_REQ = 400;
const SERVER_ERR = 500;

var app;

class Listener {
	#server;
	#app;
	#uri;
	#port;
	#page_posts_limit;
	#sessions;
	constructor(server, config) {
		this.#server = server;
		this.#uri = config.uri;
		this.#port = config.port;
		this.#app = express();
		this.#page_posts_limit = config.page_posts_limit;
		this.#sessions = new SessionManager(config.session_ttl_sec);

		app = this.#app;
		this.#setup_app();
	}

	#setup_app() {
		app.set("view engine", "pug");
		app.set("views", path.join(__dirname, "../views"));

		app.use( cors({origin: this.full_url()}) );
		app.use( express.static(path.join(__dirname, "../views")) );
		app.use( express.urlencoded({ extended: true }) );
		app.use(cookieParser())
		app.use(express.json());

		this.#setup_user_crud();
		this.#setup_reddit_calls();
		this.#setup_posts_crud();

		app.get("/", (request, response) => {
			console.log("main page"); // debug
			response.render("index");
		}); // default page
	} // end app_setup

	async start() {
		console.log("trying to auth reddit");
		await this.#reddit().authenticate_basic();
		app.listen(this.#port, () => {
			console.log(`server listening on ${this.full_url()}`);
		});
	}

	full_url() {
		return "http://" + this.#uri + ":" + this.#port;
	}

	#auth() {
		return this.#server.authenticator();
	}

	#reddit() {
		return this.#server.reddit();
	}

	#database() {
		return this.#server.database();
	}

	#send_unautorized(response, user) {
		response.status(406).send("You must be an autorized user to perform this action!")
	}

	#setup_user_crud() {
		// token authentication middleware
		app.use(async (request, response, next) => {
			console.log(`request to ${request.originalUrl}`); // debug
			let token = request.cookies.user_token;
			if (token) {
				console.log(`request with token`); // debug
				try {
					let user_data = await this.#auth().verify(token);
					request.user_data = user_data;
					response.locals.user_data = user_data;
				}
				catch (error) {
					console.log(error);
				}
			}
			next();
		}); // use 

		app.get("/signup", (request, response) => {
			console.log("signup page"); // debug
			response.render("signup");
		});

		app.post("/signup", (request, response) => {
			console.log("post signup"); // debug
			console.log(JSON.stringify(request.body)); // debug
			let {username, password, role} = request.body;
			this.#auth().register(username, password, role)
			.then((user) => {
				// response.status(200).send(`Successful signup: ${user.username}`);
				response.redirect("/")
			}) // then
			.catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "Could not register user", 
					error: err.message
				}); // send
			}); // catch
		}); // signup

		app.get("/login", (request, response) => {
			console.log("get login"); // debug
			if (request.user_data)
			{
				console.log(`user ${request.user_data.username} is already logged in`);
				response.redirect("/");
			}
			else
				// response.send("login"); // temporary
				response.render("login");
		}); // get login

		app.post("/login", (request, response) => {
			console.log("post login"); // debug
			console.log(JSON.stringify(request.body)); // debug

			let {username, password} = request.body;

			this.#auth().login(username, password)
			.then((user_data) => {
				let {user, token} = user_data;

				response.cookie("user_token", token, {
					httpOnly: true, 
					maxAge: this.#auth().max_age_sec() * 1000
				});
				response.redirect("/");
			}) // then
			.catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "Could not login user", 
					error: err.message
				});
			}); // catch
		}); // post login

		app.post("/logout", (request, response) => {
			console.log("post logout"); // debug
			response.clearCookie("user_token");
			response.redirect("/")
		}); // post logout

		app.get("/users", (request, response) => {
			console.log("get users"); // debug
			this.#database().get_user_list().then((users) => {
				response.render("user_list", {users});
			})
			.catch((err) => {
				response.status(SERVER_ERR).send({
					message: "Could Not Read Users", 
					error: err.message
				});
			}); // catch
		}); // get users

		app.get("/user/update/:username", (request, response) => {
			console.log("get update user"); // debug
			let username = request.params.username
			let user = this.#database().get_user(username);
			if (!user)
				response.redirect("/users");
			else
				response.render("edit_user", {username, edited_user:user});
		}); // post user update

		app.post("/user/update/:username", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return this.#send_unautorized(response, curr_user);

			let user_details = request.body;
			user_details.username = request.params.username;
			this.#auth().update_user(user_details)
			.then((user) => {
				response.redirect("/users");
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "Could not update user", 
					error: err.message
				});
			}); // catch
		}); // post user update

		app.post("/user/delete/:username", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return this.#send_unautorized(response, curr_user);

			let username = request.params.username;
			this.#auth().delete_user(username)
			.then(() => {
				// response.status(OK).send(`deleted user ${username}`);
				response.redirect("/users");
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "Could not delete user", 
					error: err.message
				});
			});
		}); // delete user delete
	}

	#setup_reddit_calls() {
		// make sure user is logged in
		app.use("/reddit", (request, response, next) => {
			if (!request.user_data)
				this.#send_unautorized(response, request.user_data);
			else
				next();
		}); // use reddit

		app.get("/reddit/r/:subreddit" ,(request, response) => {
			let {username} = request.user_data;
			let step = request.query.step;
			let subreddit = request.params.subreddit;

			this.#get_posts(username, subreddit, step,
			 (data) => this.#reddit_read(subreddit, data))
			.then((posts) => {
				response.render("reddit_posts", {subreddit, posts});
			})
			.catch((err) => {
				console.log(err);
				response.status(SERVER_ERR).send({
					error: "could not read posts",
					message: err.message
				});
			}); // catch
		}); // get r :subreddit

		app.get("/reddit/sub", (request, response) => {
			let subreddit = request.query.subreddit;
			response.redirect("/reddit/r/" + subreddit);
		});

		app.get("/reddit/search", (request, response) => {
			let {username} = request.user_data;
			let query = request.query.query.trim();
			let step = request.query.step;
			if (!query)
				return response.redirect("/");

			this.#get_posts(username, "s:"+query, step, 
				(data) => this.#reddit_search(query, data))
			.then((posts) => {
				// response.send(posts);
				response.render("reddit_search", {query, posts});
			})
			.catch((err) => {
				console.log(err);
				response.status(SERVER_ERR).send({
					error: "could not read posts",
					message: err.message
				});
			}); // catch
		}); // get reddit search
	}

	#setup_posts_crud() {
		// make sure user is logged in
		app.use("/posts", (request, response, next) => {
			if (!request.user_data)
				this.#send_unautorized(response, request.user_data);
			else
				next();
		}); // use posts

		app.get("/posts", (request, response) => {
			let username = request.user_data.username;
			this.#database().posts_of(username)
			.then((posts) => response.render("saved_posts", {posts}))
			.catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "could not delete post",
					error: err
				});
			}); // catch
		}); // get posts

		// consider instead of getting new post, 
		// holding current posts in session and saving
		// from there
		app.post("/posts/save", async (request, response) => {
			let post_fullname = request.body.post;
			let username = request.user_data.username;
			console.log(`user ${username} saving post .${post_fullname}.`); // debug
			this.#reddit().get_post_by_name(post_fullname)
			.then((post) => {
				if (!post)
					throw new Error(`Post ${post_fullname} Not Found`);

				this.#database().save_post(username, post);
				response.sendStatus(OK);
			}).catch((err) => {
				console.log(err); // debug
				response.status(BAD_REQ).send({
					message: "could not delete post",
					error: err
				});
			}); // catch
		}); // post posts save

		app.post("/posts/remove", (request, response) => {
			let post_fullname = request.body.post;
			let username = request.user_data.username;
			this.#database().remove_post_from_user(username, post_fullname)
			.then(() => response.sendStatus(OK))
			.catch((err) => {
				console.log(err);
				response.status(BAD_REQ).send({
					message: "could not delete post",
					error: err
				});
			}); // catch
		}); // post posts remove
	}

	async #get_posts(username, domain, step, reader) {
		let request_data = {limit: this.#page_posts_limit};
		let session = this.#sessions.get(username);

		// handle before/after
		if (session.is_for(domain) && step && session.step(step))
			request_data[step] = session.step(step);
			
		let data = await reader(request_data);
		let {before, after, posts} = data;

		before = before ? before : posts.at(0).fullname;
		after = after ? after : posts.at(-1).fullname;
		session.set_window(domain, before, after, this.#page_posts_limit);

		return posts;
	}

	#reddit_read(subreddit, data) {
		return this.#reddit().read_posts(subreddit, data);
	}

	#reddit_search(query, data) {
		return this.#reddit().search(query, data);
	}
}

module.exports = Listener;
