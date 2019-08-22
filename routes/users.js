const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const mongoose = require("mongoose");
const moment = require("moment"); 

//Setup validation
const {
	check, validationResult
} = require("express-validator");

//User Model
const User = require("../models/user");
const Article = require("../models/article");
const ArticleLog = require("../models/articleLog");
const Rank = require("../models/rank");
const Warn = require("../models/warn");
const Ban = require("../models/ban");
const Block = require("../models/block");


//Display register form
router.get("/register", (req, res) => {
	res.render("register");
});

//Handle register form
router.post("/register",[
	//Validation
	check("username","Nazwa użytkownika jest wymagana.").not().isEmpty()
		.custom(async (value)=>{
			const user = await User.findOne({
				username: value.toLowerCase()
			});
			if (user) {throw new Error("Podana nazwa użytkownika jest zajęta.");}
			else {return value;}
		}),
	check("email","Email jest wymagany.").not().isEmpty()
		.isEmail().withMessage("Email jest niepoprawny.")
		.custom(async (value)=>{
			const user = await User.findOne({
				email: value.toLowerCase()
			});
			if (user) {throw new Error("Podany adres email jest już w użyciu.");}
			else {return value;}
		}),
	check("password","Hasło jest wymagane.").not().isEmpty()
		.custom((value, {
			req
		})=> value === req.body.password2).withMessage("Hasła nie są zgodne.")
], (req, res) => {

	//Handle errors
	const errors = validationResult(req);
	if (!errors.isEmpty()){
		res.render("register",{
			errors: errors.array()
		});
	} else {
		//Add user
		const username = req.body.username;
		const email = req.body.email;
		const newUser = new User({
			username: username.toLowerCase(),
			email: email.toLowerCase(),
			password: req.body.password
		});

		bcrypt.genSalt(10, (err, salt)=>{
			bcrypt.hash(newUser.password, salt, (err, hash) =>{
				if (err){
					console.log(err);
				}
				newUser.password = hash;
				newUser.save((err) =>{
					if (err){
						console.log(err);
						return;
					} else {
						req.flash("success","Rejestracja przebiegła pomyślnie. Możesz się teraz zalogować.");
						res.redirect("/");
					}
				});
			});
		});
	}

});

//Display login form
router.get("/login", (req, res) => {
	req.session.backURL=req.header("Referer") || "/";
	res.render("login");
});

//Handle login form
router.post("/login", (req, res, next) => {
	passport.authenticate("local", {
		successRedirect: req.session.backURL || "/",
		failureRedirect: "/users/login",
		failureFlash: true,
		successFlash: "Logowanie przebiegło pomyślnie.",
		badRequestMessage: "Nie wypełniony formularza"
	})(req, res, next);
});

//Logout
router.post("/logout", (req, res) => {
	req.logout();
	req.flash("success", "Pomyślnie wylogowaneo.");
	res.redirect("/users/login");
});

router.get("/list", async(req, res)=>{
	const query = [
		{
			$lookup:{
				from: "ranks",
				localField: "type",
				foreignField: "_id",
				as: "rank"
			}
		},
		{
			$unwind: "$rank"
		},
		{
			$project:{
				username: 1,
				registerDate: 1,
				rank: "$rank.name",
			}
		},
		{
			$sort: {
				_id: -1
			}
		}
	];
	if (typeof req.query.user != "undefined") {
		const usernameQuery = {
			"username": {
				$regex: ".*"+ req.query.user.toLowerCase()+ ".*"
			}
		};
		let searchQuery = {};
		if (req.query.rank != "all"){
			const rankId = await Rank.findOne({
				name: req.query.rank
			});
			searchQuery = {
				$match:{
					$and: [usernameQuery, {
						"type": rankId._id
					}]
				}
			};
		} else {
			searchQuery = {
				$match: usernameQuery
			};
		}
		query.unshift(searchQuery);
	}
	User.aggregate(query, (err, users)=>{
		if (err){
			console.log(err);
		} else {
			const translatedRanks = {
				"admin": "Administrator",
				"moderator":"Moderator",
				"journalist": "Redaktor",
				"user": "Użytkownik"
			};
			const searchRank = req.query.rank || "";
			res.render("user_list", {
				users,
				translatedRanks,
				searchRank
			});
		}
	});
});

router.post("/list",[
	check("username").custom((value)=>{
		if (value.length<3 && value.length>0) {throw new Error("Hasło wyszukiwania musi posiadać conajmniej trzy znaki");}
		else {return true;}
	})
], async(req, res) => {
	const errors = validationResult(req);
	const users = await User.aggregate([
		{
			$lookup:{
				from: "ranks",
				localField: "type",
				foreignField: "_id",
				as: "rank"
			}
		},
		{
			$unwind: "$rank"
		},
		{
			$project:{
				username: 1,
				registerDate: 1,
				rank: "$rank.name",
			}
		},
		{
			$sort: {
				_id: -1
			}
		}
	]);
	const translatedRanks = {
		"admin": "Administrator",
		"moderator":"Moderator",
		"journalist": "Redaktor",
		"user": "Użytkownik"
	};
	if (!errors.isEmpty()){
		res.render("user_list",{
			errors: errors.array(),
			users,
			translatedRanks
		});
	} else {
		res.redirect("/users/list?user="+req.body.username+"&rank="+req.body.rank);
	}
});

//User profile
router.get("/:id", async(req, res) => {
	User.findById(req.params.id, async(err, userP) => {
		if (err){
			console.log(err);
			return;
		} else {
			const userRank = await Rank.findById(userP.type);
			const translatedRanks = {
				"admin": "Administrator",
				"moderator":"Moderator",
				"journalist": "Redaktor",
				"user": "Użytkownik"
			};
			const redirect = {
				userRank: translatedRanks[userRank.name],
				userRankStyle: userRank.name,
				userP,
				allowEdit: false,
				displayLogs: false
			};
            
			const query = {
				$and: [{
					author: mongoose.Types.ObjectId(req.params.id)
				}, {
					displayed: true
				}]
			};
			const articles = await Article.countDocuments(query); 
            
			if (articles > 0){ redirect.articles = articles;}
			if (req.user){
				const rank = await Rank.findById(req.user.type);
				if (userP._id.toString() == req.user._id.toString() || rank.editUser){
					redirect.allowEdit = true;
				}
				redirect.punishUser = rank.punishUser;
				redirect.blockAdding = userP.type == "5d430b10b6d4219b1d45893b" ? rank.punishUser : false;
				
				if (userP.type == "5d430adcb6d4219b1d458939"){
					redirect.punishUser = false;
					if (userP._id.toString() != req.user.id.toString()){
						redirect.allowEdit = false;
					}
				}

				if (req.user._id.toString() == req.params.id || rank.editUser){
					const articleLogs = await ArticleLog.aggregate([
						{
							$match:{
								authorId: mongoose.Types.ObjectId(req.params.id)
							}
						}, 
						{
							$lookup:{
								from: "users",
								localField: "editedBy",
								foreignField: "_id",
								as: "edit"
							}
						},
						{
							$unwind: "$edit"
						},
						{
							$lookup:{
								from: "articles",
								localField: "articleId",
								foreignField: "_id",
								as: "article"
							}
						},
						{
							$unwind: "$article"
						},
						{
							$project:{
								editor: "$edit.username",
								editorId: "$editedBy",
								title: "$article.title",
								reason: 1,
								date: 1,
								articleId: 1,
								action: 1,
								displayed: 1
							}
						},
						{
							$sort: {
								_id: -1
							}
						}
					]);
					if (articleLogs != ""){
						redirect.articleLogs = articleLogs;
						redirect.displayLogs = true;
					}
				}

				if (req.user._id.toString() == req.params.id || rank.punishUser){
					const query = [
						{
							$match:{
								userId: mongoose.Types.ObjectId(req.params.id)
							}
						},
						{
							$lookup:{
								from: "users",
								localField: "authorId",
								foreignField: "_id",
								as: "author"
							}
						},
						{
							$unwind: "$author"
						},
						{
							$project:{
								authorId: 1,
								author: "$author.username",
								date: 1,
								reason: 1,
							}
						},
						{
							$sort:{
								_id: -1
							}
						}
					];
					const warns = await Warn.aggregate(query);
					if (warns != ""){
						redirect.warns = warns;
						redirect.displayLogs = true;
					}
					
					query[query.length-2].$project.endDate = 1;
					const bans = await Ban.aggregate(query);
					if (warns != ""){
						redirect.bans = bans;
						redirect.displayLogs = true;
					}
				}
			}
			res.render("profile",redirect);
		}
	});
});

router.post("/:id/action", ensureAuthenticated, punishAccess, async (req, res)=>{
	const user = await User.findById(req.params.id);
	switch (req.body.controlAction){
	case "giveBan":
		res.render("punish_ban",{
			user
		});
		break;
	case "giveWarn":
		res.render("punish_warn",{
			user
		});
		break;
	case "blockAdding":
		res.render("punish_block",{
			user
		});
		break;
	default:
		console.log("test");
		break;
	}
});

router.post("/:id/action/:type", ensureAuthenticated, punishAccess, [
	check("reason","Powód jest wymagany.").not().isEmpty()
], async (req, res) => {
	function insertToDb(err, msg){
		if (err){
			console.log(err);
		} else {
			req.flash("success", msg);
			res.redirect("/users/"+req.params.id);
		}
	}

	function setLength(length){
		switch (length){
		case "day": return 1;
		case "2days": return 2;
		case "week": return 7;
		case "2weeks": return 14;
		case "month": return 30;
		case "perm": return 999;
		}
	}
	switch (req.params.type){
	case "warn":{
		const warn = new Warn;
		warn.userId = req.params.id;
		warn.authorId = req.user._id;
		warn.reason = req.body.reason;
		warn.save(err => insertToDb(err, "Pomyślnie dodano ostrzeżenie"));
		break;
	}
	case "ban":{
		const length = setLength(req.body.length);
		const date = moment();
		const endDate = moment(date).add(length, "days");
		const currentBan = await Ban.findOne({
			userId: req.params.id
		}).sort({
			_id: -1
		}).limit(1);
		if (currentBan != null){
			if (moment(currentBan.endDate).diff(endDate) > 0){
				req.flash("error", "Nie można nadać banicji trwającej krócej niż obecna.");
				res.redirect("/users/"+req.params.id);
				break;
			}
		}
		const ban = new Ban;
		ban.userId = req.params.id;
		ban.authorId = req.user._id;
		ban.reason = req.body.reason;
		ban.endDate = endDate;
		ban.save(err => insertToDb(err, "Pomyślnie nadano banicje."));
		break;
	}
	case "block":{
		const block = new Block;
		block.userId = req.params.id;
		block.authorId = req.user._id;
		block.reason = req.body.reason;
		const date = moment();
		const length = setLength(req.body.length);
		const endDate = moment(date).add(length, "days");
		block.endDate = endDate;
		block.save(err => insertToDb(err, "Pomyślnie nadano blokade."));
		break;
	}
	}
	
});

router.get("/:id/:action/:type/:banId", ensureAuthenticated, punishAccess, async(req, res)=>{
	const user = await User.findById(req.params.id);
	const ban = await Ban.findById(req.params.banId);
	const redirect = {
		declineLink: "/users/"+req.params.id,
	};
	if (req.params.type === "ban"){
		redirect.message = "Powód: " + ban.reason + " | Koniec: " + moment(ban.endDate).format("DD/MM/YYYY");
		if (req.params.action == "delete"){
			redirect.title = "Czy na pewno chcesz usunąć banicje użytkownika " + user.username.charAt(0).toUpperCase() + user.username.slice(1) + "?";
			redirect.acceptLink = req.params.id + "/delete/ban/" + req.params.banId + "?_method=DELETE";
		} else if (req.params.action == "dezactivate"){
			redirect.title = "Czy na pewno chcesz dezaktywować banicje użytkownika " + user.username.charAt(0).toUpperCase() + user.username.slice(1) + "?",
			redirect.acceptLink = req.params.id + "/dezactivate/ban/" + req.params.banId;
		} else {
			req.flash("error", "Nie znaleziono podanego linku.");
			res.redirect("/");
		}
		
	}
	else {
		req.flash("error", "Nie znaleziono podanego linku.");
		res.redirect("/");
	}
	res.render("ensure",redirect);
});

//edit user profile
router.get("/edit/:id",ensureAuthenticated,editAccess, async(req, res) => {
	User.findById(req.params.id, async(err, userP) => {
		if (err){
			console.log(err);
			return;
		} else {
			const rank = await Rank.findById(req.user.type);
			const redirect = {
				userP,
				superEdit: rank.editRank,
				ranks: await Rank.find({},{
					name: 1
				}),
				translatedRanks: {
					"admin": "Administrator",
					"moderator":"Moderator",
					"journalist": "Redaktor",
					"user": "Użytkownik"
				}
			};
			res.render("edit_profile", redirect);
		}
	});
});

router.post("/edit/:id", ensureAuthenticated, editAccess, async(req, res) => {
	let updateQuery = "";
	if (typeof req.body.type != "undefined"){
		const ranks = await Rank.find({},{
			_id: 1
		});
		const rankList = ranks.map((x) => x._id.toString());
		if (rankList.includes(req.body.type.toString())){
			updateQuery = {
				$set: {
					email: req.body.email,
					type: req.body.type
				}
			}; 
		} else {
			updateQuery = {
				$set: {
					email: req.body.email
				}
			}; 
		}  
	} else {
		updateQuery = {
			$set: {
				email: req.body.email
			}
		};
	}
	User.updateOne({
		_id: mongoose.Types.ObjectId(req.params.id)
	},updateQuery, (err) =>{
		if (err){
			console.log(err);
			return;
		} else {
			req.flash("success", "Pomyślnie edytowano profil.");
			res.redirect("/users/edit/"+req.params.id);
		}
	});
});

async function punishAccess(req, res, next){
	accessHandle(await access("punishUser", req), req, res, next);
}

async function editAccess(req, res,  next){
	const condition = (await access("editUser", req) || req.params.id == req.user._id.toString());
	accessHandle(condition, req, res,  next);
}

function accessHandle(condition, req, res, next){
	if (condition){
		return next();
	} else {
		req.flash("error", "Brak dostępu.");
		res.redirect("/");
	}
}

async function access(accessType, req){
	const rank = await Rank.findById(req.user.type);
	return rank[accessType];
}

function ensureAuthenticated(req, res, next){
	if (req.isAuthenticated()){
		return next();
	} else {
		req.flash("error", "Brak dostępu.");
		res.redirect("/");
	}
}

module.exports = router;