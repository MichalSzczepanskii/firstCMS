const bcrypt = require("bcryptjs");
const User = require("../models/user");
const LocalStrategy = require("passport-local").Strategy;

module.exports = (passport) => {
	//Local Strategy
	passport.use(new LocalStrategy((username, password, done)=>{
		//Match Username
		const query = {
			username: username.toLowerCase()
		};
		User.findOne(query, (err, user) => {
			if (err) {throw err;}
			if (!user){
				return done(null, false, {
					message: "Błędny login lub hasło."
				});
			}

			//Match password
			bcrypt.compare(password, user.password, (err, isMatch) =>{
				if (err) {throw err;}
				if (isMatch){
					return done(null, user);
				} else {
					return done(null, false, {
						message: "Błędny login lub hasło"
					});
				}
			});
		});
	}));

	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	passport.deserializeUser((id, done) => {
		User.findById(id, (err, user) => {
			done(err, user);
		});
	});
};