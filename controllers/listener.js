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
	constructor(server, uri, port) {
		this.#server = server;
		this.#uri = uri;
		this.#port = port;
		this.#app = express();
		this.#setup_app();
	}

	#setup_app() {
		// later
		// this.#app.set("view engine", "pug");
		// this.#app.set("views", path.join(__dirname, "views"));

		this.#app.use( cors({origin: this.full_url()}) );
		this.#app.use( express.static(path.join(__dirname, "views")) );
		this.#app.use( express.urlencoded({ extended: true }) );
		this.#app.use(cookieParser())
		this.#app.use(express.json());

		// token authentication middleware
		this.#app.use(async (request, response, next) => {
			let token = request.cookies.user_token;
			if (token) {
				console.log(`request with token`); // debug
				try {
					let user_data = await this.auth().verify(token);
					request.user_data = user_data;
				}
				catch (error) {
					console.log(error)
				}
			}
			next();
		}); // use 
		
		this.#app.get("/", (request, response) => {
			console.log("main page"); // debug
			if (request.user_data)
				response.send(`Welcome, ${request.user_data.username}!`);
				// response.render("index", request.user_data);
			else
				response.send("Welcome, Guest!");
				// response.render("index");
		});

		this.#app.post("/signup", (request, response) => {
			console.log("post signup"); // debug
			console.log(JSON.stringify(request.body)); // debug
			let {username, password, role} = request.body;
			this.auth().register(username, password, role)
			.then((user) => {
				response.status(200).send(`Successful signup: ${user.username}`);
				// response.status(200).render("succesful_signup", user.username);
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
				response.send("login"); // temporary
				// response.render("login");
		}); // get login

		this.#app.post("/login", (request, response) => {
			console.log("post login"); // debug
			console.log(JSON.stringify(request.body))
			let {username, password} = request.body;
			this.auth().login(username, password)
			.then((user_data) => {
				let {user, token} = user_data;
				response.cookie("user_token", token, {
					httpOnly: true, 
					maxAge: this.auth().max_age_sec() * 1000
				});
				// TEMP
				response.status(200).send(`Successful Login: ${user.username}`);
				// response.status(200).render("succesful_login", user.username);
			}) // then
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not login user", 
					error: err.message
				});
			}); // catch
		}); // post login

		this.#app.put("/update/user", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return send_unautorized(response, curr_user);

			let user_details = request.body;
			this.auth().update_user(user_details)
			.then((user) => {
				// TEMP
				response.status(200).send(`Successful Update: ${JSON.stringify(user)}`);
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not update user", 
					error: err.message
				});
			}); // catch
		}); // put update/user

		this.#app.delete("/delete/user", (request, response) => {
			let curr_user = request.user_data;
			if (!curr_user || curr_user.role !== "admin")
				return send_unautorized(response, curr_user);

			let username = request.body.username;
			this.auth().delete_user(username)
			.then(() => {
				response.status(200).send(`deleted user ${username}`);
			})
			.catch((err) => {
				console.log(err); // debug
				response.status(400).send({
					message: "Could not delete user", 
					error: err.message
				});
			});
		}); // delete delete/user
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
}

module.exports = Listener;
