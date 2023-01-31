'use strict';

const express = require('express');
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

class Listener {
	#server;
	#uri;
	#port;
	#app;
	#database;
	constructor(server, uri, port) {
		this.#server = server;
		this.#database = server.database();
		this.#uri = uri;
		this.#port = port;
		this.#app = express();
		this.#setup_app();
	}

	#setup_app() {
		// later
		this.#app.set("view engine", "pug");
		this.#app.set("views", path.join(__dirname, "../views"));

		this.#app.use( cors({origin: this.full_url()}) );
		this.#app.use( express.static(path.join(__dirname, "../views")) );
		this.#app.use( express.urlencoded({ extended: true }) );
		this.#app.use(cookieParser())
		this.#app.use(express.json());

		// token authentication middleware
		this.#app.use(async (request, response, next) => {
			console.log(`request to ${request.originalUrl}`); // debug
			let token = request.cookies.user_token;
			if (token) {
				console.log(`request with token`); // debug
				try {
					let user_data = await this.auth().verify(token);
					request.user_data = user_data;
					response.locals.user_data = user_data;
				}
				catch (error) {
					console.log(error)
				}
			}
			next();
		}); // use 
		
		this.#app.get("/", (request, response) => {
			console.log("main page"); // debug
			response.render("index");
		}); // default page

		this.#app.get("/signup", (request, response) => {
			console.log("signup page");
			response.render("signup");
		});

		this.#app.post("/signup", (request, response) => {
			console.log("post signup"); // debug
			console.log(JSON.stringify(request.body)); // debug
			let {username, password, role} = request.body;
			this.auth().register(username, password, role)
			.then((user) => {
				// response.status(200).send(`Successful signup: ${user.username}`);
				response.redirect("/")
			}) // then
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not register user", 
					error: err.message
				}); // send
			}); // catch
		}); // signup

		this.#app.get("/login", (request, response) => {
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

		this.#app.post("/login", (request, response) => {
			console.log("post login"); // debug
			console.log(JSON.stringify(request.body)); // debug

			let {username, password} = request.body;

			this.auth().login(username, password)
			.then((user_data) => {
				let {user, token} = user_data;

				response.cookie("user_token", token, {
					httpOnly: true, 
					maxAge: this.auth().max_age_sec() * 1000
				});
				response.redirect("/");
			}) // then
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not login user", 
					error: err.message
				});
			}); // catch
		}); // post login

		this.#app.post("/logout", (request, response) => {
			console.log("post logout"); // debug
			response.clearCookie("user_token");
			response.redirect("/")
		}); // post logout

		this.#app.get("/users", (request, response) => {
			console.log("get users"); // debug
			this.#database.get_user_list().then((users) => {
				response.render("user_list", {users});
			})
			.catch((err) => {
				response.status(500).send({
					message: "Could Not Read Users", 
					error: err.message
				});
			}); // catch
		}); // get users

		this.#app.get("/user/update/:username", (request, response) => {
			console.log("get update user"); // debug
			let username = request.params.username
			let user = this.#database.get_user(username);
			if (!user)
				response.redirect("/users");
			else
				response.render("edit_user", {username, edited_user:user});
		});

		this.#app.post("/user/update/:username", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return this.send_unautorized(response, curr_user);

			let user_details = request.body;
			user_details.username = request.params.username;
			this.auth().update_user(user_details)
			.then((user) => {
				response.redirect("/users");
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not update user", 
					error: err.message
				});
			}); // catch
		}); // post user/update

		this.#app.post("/user/delete/:username", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return this.send_unautorized(response, curr_user);

			let username = request.params.username;
			this.auth().delete_user(username)
			.then(() => {
				// response.status(200).send(`deleted user ${username}`);
				response.redirect("/users");
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not delete user", 
					error: err.message
				});
			});
		}); // delete user/delete
	} // end app_setup

	start() {
		this.#app.listen(this.#port, () => {
			console.log(`server listening on ${this.full_url()}`);
		});
	}

	full_url() {
		return "http://" + this.#uri + ":" + this.#port;
	}

	auth() {
		return this.#server.authenticator();
	}

	send_unautorized(response, user) {
		response.status(406).send("You must be an autorized user to perform this action!")
	}
}

module.exports = Listener;
