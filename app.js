const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const methodOverride = require("method-override");

const config = require("./config/database");

const app = express();

//Database
mongoose.connect(config.database,{
	useNewUrlParser: true
});
const db = mongoose.connection;

db.once("open", () => console.log("Connected to MongoDB"));
db.on("error", (err) => console.log(err));

//MethodOverride middleware
app.use(methodOverride("_method"));

//View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine","pug");

//Body Parser Middleware
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());

//Setup public folder
app.use(express.static(path.join(__dirname,"public")));

//Session middleware
app.set("trust proxy", 1); // trust first proxy
app.use(session({
	secret: "keyboard cat",
	resave: true,
	saveUninitialized: true
}));

//Flash Middleware
app.use(flash());

//Messages middleware
app.use(function (req, res, next) {
	res.locals.messages = require("express-messages")(req, res);
	next();
});

//Passport Config
require("./config/passport")(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Global Variable For User Session
app.get("*", (req, res, next) =>{
	res.locals.user = req.user || null;
	next();
});

//Bring in models
const Article = require("./models/article");

//Home route
app.get("/",async(req, res) => {
	const articleCount = await Article.countDocuments({
		displayed: true
	});
	const pageCount = Math.ceil(articleCount/5);
	const page = parseInt(req.query.page,10) || 1;
	const articles = await Article.aggregate(
		[
			{
				$match: {
					displayed: true
				}
			},
			{
				$lookup: {
					from: "users", 
					localField: "author", 
					foreignField: "_id", 
					as: "user"
				}
			},
			{
				$unwind: "$user"
			},
			{
				$project:{
					"title": 1, 
					"author": "$user.username",
					"author_id": "$user._id",
					"displayed": 1,
					"date": 1 ,
					"short": {
						$substr: ["$content", 0, 750]
					}
				}
			},
			{
				$sort: {
					_id: -1
				}
			}
		]
	).skip(5*(page - 1))
		.limit(5);
	const nextPage = page + 1;
	const nextSecondPage = nextPage + 1;
	const previousPage = page - 1 < 1 ? 1 : page - 1;
	const previousSecondPage = previousPage - 1 == previousPage ? 0 : previousPage - 1;
	res.render("index",{
		articles,
		pageCount,
		nextPage,
		page,
		previousPage,
		previousSecondPage,
		nextSecondPage
	});

});

app.locals.ucfirst = function(value){
	return value.charAt(0).toUpperCase() + value.slice(1);
};

//Route files
const users = require("./routes/users");
const articles = require("./routes/articles");

app.use("/users", users);
app.use("/articles", articles);

//Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));