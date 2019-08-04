const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const mongoose = require('mongoose'); 

//Setup validation
const { check, validationResult } = require('express-validator');

//User Model
const User = require('../models/user');
const Article = require('../models/article');
const ArticleLog = require('../models/articleLog');
const Rank = require('../models/rank');


//Display register form
router.get('/register', (req, res) => {
    res.render('register');
})

//Handle register form
router.post('/register',[
    //Validation
    check('username','Nazwa użytkownika jest wymagana.').not().isEmpty()
        .custom(async (value)=>{
            let user = await User.findOne({username: value.toLowerCase()});
            if (user) throw new Error("Podana nazwa użytkownika jest zajęta.");
            else return value;
        }),
    check('email','Email jest wymagany.').not().isEmpty()
        .isEmail().withMessage('Email jest niepoprawny.')
        .custom(async (value)=>{
            let user = await User.findOne({email: value.toLowerCase()});
            if (user) throw new Error("Podany adres email jest już w użyciu.");
            else return value;
        }),
    check('password','Hasło jest wymagane.').not().isEmpty()
        .custom((value, {req})=> value === req.body.password2).withMessage("Hasła nie są zgodne.")
], (req, res) => {

    //Handle errors
    let errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('register',{
            errors: errors.array()
        })
    }else{
        //Add user
        let username = req.body.username;
        let email = req.body.email;
        let newUser = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: req.body.password
        });

        bcrypt.genSalt(10, (err, salt)=>{
            bcrypt.hash(newUser.password, salt, (err, hash) =>{
                if(err){
                    console.log(err);
                }
                newUser.password = hash;
                newUser.save((err) =>{
                    if(err){
                        console.log(err);
                        return;
                    }else{
                        req.flash('success','Rejestracja przebiegła pomyślnie. Możesz się teraz zalogować.');
                        res.redirect('/');
                    }
                })
            })
        })
    }

});

//Display login form
router.get('/login', (req, res) => {
    res.render('login');
})

//Handle login form
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
        successFlash: "Logowanie przebiegło pomyślnie.",
        badRequestMessage: "Nie wypełniony formularza"
    })(req, res, next)
})

//Logout
router.post('/logout', (req, res, next) => {
    req.logout();
    req.flash('success', 'Pomyślnie wylogowaneo.');
    res.redirect('/users/login');
})

//User profile
router.get('/:id', async(req, res, next) => {
    User.findById(req.params.id, async(err, userP) => {
        if (err){
            console.log(err)
            return;
        }else{
            const userRank = await Rank.findById(userP.type);
            const translatedRanks = {
                'admin': 'Administrator',
                'moderator':'Moderator',
                'journalist': 'Redaktor',
                'user': 'Użytkownik'
            }
            redirect = {}
            redirect.userRank = translatedRanks[userRank.name]
            redirect.userRankStyle = userRank.name
            redirect.userP = userP;
            redirect.allowEdit = false;
            
            let query = {
                $and: [{author: mongoose.Types.ObjectId(req.params.id)}, {displayed: true}]
                
            }
            const articles = await Article.countDocuments(query); 
            
            if (articles > 0){ redirect.articles = articles}
            if (req.user){
                const rank = await Rank.findById(req.user.type);
                if(userP._id.toString() == req.user._id.toString() || rank.editUser){
                    redirect.allowEdit = true;
                }
                if(userP.type=='5d430adcb6d4219b1d458939' && userP._id.toString() != req.user.id.toString()){//admin
                    redirect.allowEdit = false;
                }

                if (req.user._id.toString() == req.params.id || rank.editUser){
                    redirect.logs = await ArticleLog.aggregate([
                        {
                            $match:{
                                authorId: mongoose.Types.ObjectId(req.params.id)
                            }
                        }, 
                        {
                            $lookup:{
                                from: 'users',
                                localField: 'editedBy',
                                foreignField: '_id',
                                as: 'edit'
                            }
                        },
                        {$unwind: "$edit"},
                        {
                            $lookup:{
                                from: 'articles',
                                localField: 'articleId',
                                foreignField: '_id',
                                as: 'article'
                            }
                        },
                        {$unwind: "$article"},
                        {
                            $project:{
                                editor: '$edit.username',
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
                }
            }
            res.render('profile',redirect);
        }
    })
});

//edit user profile
router.get('/edit/:id',ensureAuthenticated,editAccess, async(req, res) => {
    User.findById(req.params.id, async(err, userP) => {
        if (err){
            console.log(err)
            return;
        }else{
            const rank = await Rank.findById(req.user.type);
            redirect = {}
            redirect.translatedRanks = {
                'admin': 'Administrator',
                'moderator':'Moderator',
                'journalist': 'Redaktor',
                'user': 'Użytkownik'
            }
            redirect.ranks = await Rank.find({},{name: 1})
            redirect.userP = userP;
            redirect.superEdit = rank.editRank;
            res.render('edit_profile', redirect);
        }
    })
})

router.post('/edit/:id', ensureAuthenticated, editAccess, async(req, res) => {
        let updateQuery = ''
        if (typeof req.body.type != 'undefined'){
            const ranks = await Rank.find({},{_id: 1})
            let rankList = ranks.map((x) => x._id.toString());
            if (rankList.includes(req.body.type.toString())){
                updateQuery = {$set: {email: req.body.email, type: req.body.type}}; 
            }else{
                updateQuery = {$set: {email: req.body.email}}; 
            }  
        }else{
            updateQuery = {$set: {email: req.body.email}};
        }
        User.updateOne({_id: mongoose.Types.ObjectId(req.params.id)},updateQuery, (err) =>{
            if(err){
                console.log(err);
                return;
            }else{
                req.flash('success', 'Pomyślnie edytowano profil.');
                res.redirect('/users/edit/'+req.params.id);
            }
        })
})


async function editAccess(req, res, next){
    const rank = await Rank.findById(req.user.type);
    if (rank.editUser || req.params.id == req.user._id.toString()){
        return next();
    }else{
        req.flash('error', 'Brak dostępu.');
        res.redirect('/');
    }
}


function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash('error', 'Brak dostępu.');
        res.redirect('/');
    }
}

module.exports = router;