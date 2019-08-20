const bcrypt = require("bcryptjs");
const moment = require("moment"); 
const Ban = require("../models/ban");
const User = require("../models/user");
const LocalStrategy = require("passport-local").Strategy;

const fullDate = function(value){
	const d = ("0" + value.getDate()).slice(-2);
	const m = ("0" + (value.getMonth() + 1)).slice(-2);
	const y = value.getFullYear();
	const h = ("0" + value.getHours()).slice(-2);
	const min = ("0" + value.getMinutes()).slice(-2);
	return `${d}.${m}.${y} ${h}:${min}`;
};

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
					User.findOne(query, (err, user) =>{
						Ban.findOne({
							userId: user._id
						}, (err, ban) =>{
							if (ban != null){
								const currentDate = moment();
								if (moment(ban.endDate).diff(currentDate) > 0){
									return done(null, false, {
										message: `Jesteś zbanowany do ${fullDate(ban.endDate)} za ${ban.reason}`
									});
								} else {
									return done(null, user);
								}
							} else {
								return done(null, user);
							}
						}).sort({
							_id: -1
						}).limit(1);
					});
					
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