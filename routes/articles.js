const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const moment = require("moment");

//Setup validation
const {
	check, validationResult
} = require("express-validator");

//Article Model
const Article = require("../models/article");
const User = require("../models/user");
const ArticleLog = require("../models/articleLog");
const Rank = require("../models/rank");
const Block = require("../models/block");

//Displaying form for adding article
router.get("/add",ensureAuthenticated, addArtAccess, blockExists, (req, res) =>{
	res.render("add_article");
});

//Handle post request from form
router.post("/add",[
	check("title","Tytuł jest wymagany.").not().isEmpty(),
	check("content","Treść jest wymagana.").not().isEmpty()
],ensureAuthenticated, addArtAccess, blockExists, (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()){
		res.render("add_article",{
			errors: errors.array()
		});
	} else {
		const article = new Article();
		article.title = req.body.title;
		article.author = req.user._id;
		article.content = req.body.content;

		article.save((err) => {
			if (err){
				console.log(err);
				return;
			} else {
				req.flash("success", "Artykuł został pomyślnie dodany.");
				res.redirect("/articles/add");
			}
		});
	}
});

//Displaying article
router.get("/:id", async(req, res) => {
	const {
		article, articleAuthor
	} = await articleAndUserById(req.params.id);
	const redirect = {
		article,
		author: articleAuthor.username,
		allowEdit: false
	};
        
	if (req.user){

		const rank = await Rank.findById(req.user.type);
		if (req.user._id.toString() == articleAuthor.id.toString() || rank.editArticle){
			if (articleAuthor.type == mongoose.Types.ObjectId("5d430adcb6d4219b1d458939")) {redirect.allowEdit = false;}//admin
			else {redirect.allowEdit =  true;}

		} else {redirect.allowEdit = false;}

		if ((ownByEditor(articleAuthor, req) && article.displayed) || (rank.editArticle)){
			const logs = await ArticleLog.aggregate([
				{
					$match:{
						articleId: mongoose.Types.ObjectId(req.params.id)
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
					$project:{
						editor: "$edit.username",
						editorId: "$editedBy",
						reason: 1,
						date: 1
					}
				},
				{
					$sort: {
						_id: -1
					}
				}
			]);
			redirect.logs = logs;
		}

		if (article.displayed || rank.editArticle) {res.render("article", redirect);}
		else {res.redirect("/");}   
	} else {
		if (article.displayed) {res.render("article", redirect);}
		else {res.redirect("/");}
	}    
            
});

//Display edit form
router.get("/edit/:id", ensureAuthenticated, editAccess, async (req, res) => {
	const {
		article, articleAuthor
	} = await articleAndUserById(req.params.id);
	if (!doNotOverideAdmin(req, res, articleAuthor)){
		res.render("edit_article",{
			articleAuthor,
			article,
			ownByEditor: ownByEditor(articleAuthor, req)
		});
	}
            
});
//Handling article edit
router.post("/edit/:id",[
	check("title","Tytuł jest wymagany.").not().isEmpty(),
	check("content","Treść jest wymagana.").not().isEmpty()
], ensureAuthenticated, editAccess, async (req, res) => {
	const {
		article, articleAuthor
	} = await articleAndUserById(req.params.id);
	if (!doNotOverideAdmin(req, res, articleAuthor)){
		const errors = validationResult(req);
		if (!errors.isEmpty()){
			res.render("add_article",{
				errors: errors.array()
			});
		} else {
			if (typeof req.body.reason !== "undefined"){
				if (req.body.reason == ""){
					req.flash("error","Powód jest wymagany.");
					res.redirect("/articles/edit/" + req.params.id);
				} else {
					const log = new ArticleLog();
					log.articleId = article._id;
					log.editedBy = req.user._id;
					log.authorId = articleAuthor._id;
					log.reason = req.body.reason;
					log.action = "edit";

					log.save((err)=>{
						if (err){
							console.log(err);
							return;
						}
					});
				}
			}
			Article.updateOne({
				_id: req.params.id
			}, {
				$set: {
					title: req.body.title,
					content: req.body.content
				}
			}, (err) =>{
				if (err){
					console.log(err);
					return;
				} else {
					req.flash("success", "Artykuł został pomyślnie edytowany.");
					res.redirect("/articles/" + req.params.id);
				}
			});
            
		}
	}  
});

router.get("/delete/:id",ensureAuthenticated, editAccess, async(req, res) => {
	const {
		articleAuthor
	} = await articleAndUserById(req.params.id);
	const rank = await Rank.findById(req.user.type);
	if (req.user._id.toString() == articleAuthor._id.toString()) {res.render("confirmDelete",{
		id: req.params.id
	});}
	else if (rank.editArticle){
		if (!doNotOverideAdmin(req,res, articleAuthor)){
			res.render("reasonDelete", {
				id: req.params.id,
				articleAuthor
			});
		}
	}
});

router.delete("/delete/:id", ensureAuthenticated, editAccess, async(req, res) => {
	const {
		article, articleAuthor
	} = await articleAndUserById(req.params.id);
	if (typeof req.body.reason !== "undefined"){
		const log = new ArticleLog();
		log.articleId = article._id;
		log.editedBy = req.user._id;
		log.authorId = articleAuthor._id;
		log.reason = req.body.reason;
		log.action = "delete";

		log.save((err)=>{
			if (err){
				console.log(err);
				return;
			}
		});
	}
	Article.update({
		_id: mongoose.Types.ObjectId(req.params.id)
	},{
		$set: {
			displayed: false
		}
	}, (err)=>{
		if (err){
			console.log(err);
			return;
		} else {
			ArticleLog.updateMany({
				$and:[{
					articleId: mongoose.Types.ObjectId(req.params.id)
				},{
					action: "edit"
				}]
			},{
				$set: {
					displayed: false
				}
			}, (err)=>{
				if (err){
					console.log(err);
					return;
				} else {
					req.flash("success", "Pomyślnie usunięto artykuł");
					res.redirect("/");
				}
			});
            
		}
	});
});

router.get("/user/:id", async(req, res)=>{
	const articles = await Article.find({
		author: mongoose.Types.ObjectId(req.params.id)
	});
	const user = await User.findById(mongoose.Types.ObjectId(req.params.id));
	res.render("article_list",{
		articles,
		user
	});
});

//Check if user that want to edit article own it
function ownByEditor(articleAuthor, req){
	if (articleAuthor._id.toString() != req.user._id.toString()){
		return false;
	} else
	{
		return true;
	} 
}

//Return article info from articles and author info from users
async function articleAndUserById(id){
	const article = await Article.findById(id);
	const articleAuthor = await User.findById(article.author);
	return {
		article,
		articleAuthor
	};
}

//Protection that not allow moderator to overide admin
function doNotOverideAdmin(req, res, articleAuthor){
	if (req.user.type != "5d430adcb6d4219b1d458939" && articleAuthor.type == "5d430adcb6d4219b1d458939"){//admin
		req.flash("error","Brak dostępu.");
		res.redirect("/");
		return true;
	}
}
async function addArtAccess(req, res, next){
	const rank = await Rank.findById(req.user.type);
	if (rank.addArticle){
		return next();
	} else {
		req.flash("error", "Brak dostępu.");
		res.redirect("/");
	}
}

async function editAccess(req, res, next){
	const rank = await Rank.findById(req.user.type);
	if (rank.editArticle){
		return next();
	} else {
		req.flash("error", "Brak dostępu.");
		res.redirect("/");
	}
}

//Protection from not logged users
function ensureAuthenticated(req, res, next){
	if (req.isAuthenticated()){
		return next();
	} else {
		req.flash("error", "Brak dostępu.");
		res.redirect("/");
	}
}

async function blockExists(req, res, next){
	const fullDate = function(value){
		const d = ("0" + value.getDate()).slice(-2);
		const m = ("0" + (value.getMonth() + 1)).slice(-2);
		const y = value.getFullYear();
		const h = ("0" + value.getHours()).slice(-2);
		const min = ("0" + value.getMinutes()).slice(-2);
		return `${d}.${m}.${y} ${h}:${min}`;
	};
	const block = await Block.findOne({
		userId: req.user._id
	}).sort({
		_id: -1
	}).limit(1);
	if (block){
		if (!block.dezactivate){
			const currentDate = moment();
			if (moment(block.endDate).diff(currentDate) > 0){
				req.flash("error", `Masz aktywną blokadę dodawania artykułów. Wygasa: ${fullDate(block.endDate)} Powód: ${block.reason}`);
				res.redirect("/");
			} else {
				return next();
			}
		} else
		{
			return next();
		}
		
	} else {
		return next();
	}
}

module.exports = router;