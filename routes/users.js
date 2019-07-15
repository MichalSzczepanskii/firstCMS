const express = require('express');
const router = express.Router();

//Setup validation
const { check, validationResult } = require('express-validator');

router.get('/register', (req, res) => {
    res.render('register');
})

router.post('/register',[
    check('nickname','Nazwa użytkownika jest wymagana.').not().isEmpty(),
    check('email','Email jest wymagany.').not().isEmpty(),
    check('password','Hasło jest wymagane.').not().isEmpty()
        .custom((value, {req})=> value === req.body.password2).withMessage("Hasła nie są zgodne.")
], (req, res) => {

    let errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('register',{
            errors: errors.array()
        })
    }else{
        res.redirect('/');
    }

});

module.exports = router;