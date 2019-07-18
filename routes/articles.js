const express = require('express');
const router = express.Router();

//Setup validation
const { check, validationResult } = require('express-validator');

//Article Model
const Article = require('../models/article');
const User = require('../models/user');

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
        article.content = req.body.content;

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


router.get('/:id', (req, res) => {
    Article.findById(req.params.id, (err, article)=>{
        
        if(err){
            console.log(err);
            return
        }else{
            User.findById(article.author, (err, user) =>{
                if(err){
                    console.log(err);
                    return;
                }else{
                    let allowEdit = '';
                    if (req.user){
                        if (req.user.id == user.id || req.user.type == 'admin' || req.user.type =='moderator'){
                            allowEdit = true;
                        }
                        if (user.type == 'admin' && req.user.type=='moderator'){
                            allowEdit = false;
                        }
                    }
                    else{
                        allowEdit = false;
                    }
                    res.render('article',{
                        article,
                        author: user.username,
                        allowEdit
                    });
                }
            })
        }
    })
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