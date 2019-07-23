const express = require('express');
const router = express.Router();
const mongose = require('mongoose');

//Setup validation
const { check, validationResult } = require('express-validator');

//Article Model
const Article = require('../models/article');
const User = require('../models/user');
const ArticleEditLog = require('../models/articleEditLog');

//Displaying form for adding article
router.get('/add',ensureAuthenticated, userDenied, (req, res) =>{
    res.render('add_article.pug');
})

//Handle post request from form
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

//Displaying article
router.get('/:id', async(req, res) => {
    const {article, articleAuthor} = await articleAndUserById(req.params.id);
    let redirect = {article,
        author: articleAuthor.username,
        allowEdit: allowEdit(articleAuthor, req)
    };
    if(req.user){
        if(ownByEditor(articleAuthor, req) || req.user.type=='admin' || req.user.type == 'moderator'){
            let logs = await ArticleEditLog.aggregate([
                {
                    $match:{
                        articleId: mongose.Types.ObjectId(req.params.id)
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
                    $project:{
                        editor: '$edit.username',
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
    }    
    res.render('article', redirect);
                
});

//Display edit form
router.get('/edit/:id', ensureAuthenticated, userDenied, async (req, res) => {
    const {article, articleAuthor} = await articleAndUserById(req.params.id)
    if(!doNotOverideAdmin(req, res, articleAuthor)){
        res.render('edit_article',{
            articleAuthor,
            article,
            ownByEditor: ownByEditor(articleAuthor, req)
        });
    }
            
});
//Handling article edit
router.post('/edit/:id',[
    check('title','Tytuł jest wymagany.').not().isEmpty(),
    check('content','Treść jest wymagana.').not().isEmpty()
], ensureAuthenticated, userDenied, async (req, res) => {
    const {article, articleAuthor} = await articleAndUserById(req.params.id);
    if(!doNotOverideAdmin(req, res, articleAuthor)){
        let errors = validationResult(req);
        if(!errors.isEmpty()){
            res.render('add_article',{
                errors: errors.array()
            })
        }else{
            if(typeof req.body.reason !== 'undefined'){
                if (req.body.reason == ''){
                    req.flash('error','Powód jest wymagany.');
                    res.redirect('/articles/edit/' + req.params.id);
                }else{
                    const log = new ArticleEditLog();
                    log.articleId = article._id;
                    log.author = article.author;
                    log.editedBy = req.user._id;
                    log.authorId = articleAuthor._id;
                    log.reason = req.body.reason;

                    log.save((err)=>{
                        if(err){
                            console.log(err);
                            return;
                        }
                    });
                }
            }
            Article.updateOne({_id: req.params.id}, {$set: {title: req.body.title, content: req.body.content}}, (err) =>{
                if(err){
                    console.log(err);
                    return;
                }else{
                    req.flash('success', 'Artykuł został pomyślnie edytowany.');
                    res.redirect('/articles/' + req.params.id);
                }
            });
            
        }
    }  
});

//Check if user has permission to edit
function allowEdit(articleAuthor, req){
    if (req.user)
    {
        if (req.user.id.toString() == articleAuthor.id.toString() || req.user.type == 'admin' || req.user.type =='moderator'){
            if (articleAuthor.type == 'admin' && req.user.type=='moderator') return false;
            else return true

        }else return false;
    }
    else return false;
}

//Check if user that want to edit article own it
function ownByEditor(articleAuthor, req){
    if (articleAuthor._id.toString() != req.user._id.toString()){
        return false
    }else
    {
        return true
    } 
}

//Return article info from articles and author info from users
async function articleAndUserById(id){
    let article = await Article.findById(id);
    let articleAuthor = await User.findById(article.author);
    return {article, articleAuthor}
}

//Protection that not allow moderator to overide admin
function doNotOverideAdmin(req, res, articleAuthor){
    if (req.user.type != 'admin' && articleAuthor.type == 'admin'){
        req.flash('error','Brak dostępu.');
        res.redirect('/');
        return true;
    }
}

//Take access from usual user
function userDenied(req, res, next){
    if (req.user.type == 'user'){
        req.flash('error', 'Brak dostępu.');
        res.redirect('/');
    }else{
        return next();
    }
}

//Protection from not logged users
function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash('error', 'Brak dostępu.');
        res.redirect('/');
    }
}

module.exports = router;