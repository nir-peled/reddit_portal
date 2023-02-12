'user strict';

class Session {
	#user;
	#domain;
	#first;
	#before;
	#after;
	#count;
	constructor(username) {
		this.#user = username;
		this.#domain = null;
		this.#before = this.#after = null;
		this.#first = null;
		this.#count = 0;
	}

	is_for(domain) {
		return this.#domain == domain;
	}

	step(direction) {
		switch (direction) {
		case "before":
			return this.before();
		case "after":
			return this.after();
		default:
			return undefined;
		}
	}

	set_window(domain, start_post, end_post, delta) {
		this.#domain = domain;
		if (!this.#first)
			this.#first = start_post;

		if (this.#first != start_post)
			this.#before = start_post;
		this.#after = end_post;
		this.#count += delta;
	}

	after() {
		return this.#after;
	}

	before() {
		return this.#before;
	}

	first() {
		return this.#first;
	}

	count() {
		return this.#count;
	}

	add(delta) {
		this.#count += delta;
	}

	user() {
		return this.#user;
	}
}

class SessionManager {
	#sessions;
	#session_ttl;
	constructor(ttl) {
		this.#session_ttl = ttl * 1000;
		this.#sessions = []
	}

	get(username) {
		console.log(`get session for ${username}`);
		console.log("sessions:");
		for (let s of this.#sessions)
			console.log(s.session);
		let session = this.#sessions.find(s => s.session.user() == username);

		if (session) {
			console.log("found");
			clearTimeout(session.timeout);
		}
		else {
			console.log("not found, creating new");
			session = {session: new Session(username), timeout:null};
			this.#sessions.push(session);
		}

		session.timeout = setTimeout(() => this.#delete_session(username),
		 this.#session_ttl);
		return session.session;
	}

	#delete_session(username) {
		this.#sessions = this.#sessions.filter(s => s.session.user() != username);
	}
}

module.exports = SessionManager;
