const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

//Setup validation
const { check, validationResult } = require('express-validator');

//User Model
const User = require('../models/user');


router.get('/register', (req, res) => {
    res.render('register');
})

router.post('/register',[
    check('nickname','Nazwa użytkownika jest wymagana.').not().isEmpty(),
    check('email','Email jest wymagany.').not().isEmpty()
        .isEmail().withMessage('Email jest niepoprawny.'),
    check('password','Hasło jest wymagane.').not().isEmpty()
        .custom((value, {req})=> value === req.body.password2).withMessage("Hasła nie są zgodne.")
], (req, res) => {

    let errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('register',{
            errors: errors.array()
        })
    }else{
        let nickname = req.body.nickname;
        let email = req.body.email;
        let newUser = new User({
            username: nickname.toLowerCase(),
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

module.exports = router;