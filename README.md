# Project: Portal for Reddit
final project in network developing class 2023a
**Author:** Nir Peled
**GitHub Link:** https://github.com/nir-peled/reddit_portal

## Running
1. Clone the Git Repository. Install All necessary packages. 
2. Open Console to project directory. Run: `npm start`
3. Open Browser to: `127.0.0.1:8081`

## Description
This project is a portal to reddit.com. Through it, one can browse different forums, search, and save posts for later viewing. 
This project supports & enforces User Authentication for most functions. Views are dynamically rendered in accordance with user information & requested data. 

## Challenges
- Figuring out reddit's public API was a bit tricky at first. 
- I needed to figure out a solution for rendering pages based on software data without PHP. 
- Saving User Information between HTTP calls. 

## Solutions
- I used Pug library for server-side dynamic rendering. 
- I Created a SessionManager to save and handle user information between calls

## Third-Party Solutions
- Node.JS as engine for the server: https://nodejs.org/en/
- Express for handling incoming HTTP calls : https://expressjs.com/
- Pug for dynamic file rendering: https://pugjs.org
- Axios for outgoing HTTP calls: https://axios-http.com/
- Mongoose for DB interfacing: 
- Library Bcrypt for password handling
- Libraries JsonWebToken & Cookie-Parser for continuous user sessions

Thanks, and have fun. 
