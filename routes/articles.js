const express = require('express');
const router = express.Router();

//Setup validation
const { check, validationResult } = require('express-validator');

//Article Model
const Article = require('../models/article');


router.get('/add',ensureAuthenticated, userDenied, (req, res) =>{
    res.render('add_article.pug');
})

router.post('/add',[
    check('title','Tytuł jest wymagany.').not().isEmpty(),
    check('content','Treść jest wymagana.').not().isEmpty()
],(req, res) => {
    let errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('add_article',{
            errors: errors.array()
        })
    }else{
        const article = new Article();
        article.title = req.body.title;
        article.author = req.user._id;
        article.content = req.user.content;

        article.save((err) => {
            if (err){
                console.log(err);
                return;
            }else{
                req.flash('success', 'Artykuł został pomyślnie dodany.');
                res.redirect('/articles/add');
            }
        })
    }
})

function userDenied(req, res, next){
    if (req.user.type == 'user'){
        req.flash('error', 'Brak dostępu.');
        res.redirect('/');
    }else{
        return next();
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