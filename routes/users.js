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
router.get('/:id', (req, res, next) => {
    User.findById(req.params.id, async(err, userP) => {
        if (err){
            console.log(err)
            return;
        }else{
            redirect = {}
            redirect.userP = userP;
            redirect.allowEdit = false;
            redirect.superEdit = false;
            if(req.user){
                if(userP._id.toString() == req.user._id.toString() || req.user.type == 'admin' || req.user.type =='moderator'){
                    redirect.allowEdit = true;
                }
                if(userP.type=='admin' && userP._id.toString() != req.user.id.toString()){
                    redirect.allowEdit = false;
                }
            }
            if(userP.type != 'user'){
                let query = {
                    author: mongoose.Types.ObjectId(req.params.id)
                }
                redirect.articles = await Article.countDocuments(query); 
            }
            if (req.user){
                if (req.user._id.toString() == req.params.id || req.user.type == 'admin' || req.user.type == 'moderator'){
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
            redirect = {}
            redirect.userP = userP;
            redirect.superEdit = false;
            if (req.user){
                if (req.user.type == 'admin'){
                    redirect.superEdit = true;
                }
            }
            res.render('edit_profile', redirect);
        }
    })
})

router.post('/edit/:id', ensureAuthenticated, editAccess, async(req, res) => {
        let updateQuery = ''
        if (typeof req.body.type != 'undefined'){
            const typeTranslated = {
                'administrator': 'admin',
                'moderator':'moderator',
                'redaktor': 'journalist',
                'użytkownik': 'user'
            }
            const type = typeTranslated[req.body.type.toLowerCase()];
            const typeList = ['admin', 'moderator', 'journalist', 'user'];
            if (typeList.includes(type)){
                updateQuery = {$set: {email: req.body.email, type: type}}; 
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

//Protection that not allow moderator to overide admin
async function editAccess(req, res, next){
    const userInfo = await User.findOne({_id: mongoose.Types.ObjectId(req.params.id)});
    if (req.user.type=='admin' || req.user.type == 'moderator'){
        if (userInfo.type=='admin' && (userInfo._id.toString() != req.user.id.toString())){
            req.flash('error','Brak dostępu.');
            res.redirect('/');
            return false;
        }else{
            return next();
        }
    }else{
        req.flash('error','Brak dostępu.');
        res.redirect('/');
        return false;   
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