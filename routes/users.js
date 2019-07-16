const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

//Setup validation
const { check, validationResult } = require('express-validator');

//User Model
const User = require('../models/user');


//Register
router.get('/register', (req, res) => {
    res.render('register');
})

router.post('/register',[
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

    let errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('register',{
            errors: errors.array()
        })
    }else{
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

//Login
router.get('/login', (req, res) => {
    res.render('login');
})

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
        successFlash: "Logowanie przebiegło pomyślnie.",
        //badRequestMessage: "Nie wypełniony formularza"
    })(req, res, next)
})

//Logout
router.post('/logout', (req, res, next) => {
    req.logout();
    req.flash('success', 'Pomyślnie wylogowaneo.');
    res.redirect('/users/login');
})

module.exports = router;