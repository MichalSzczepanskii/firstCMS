const express = require('express');
const router = express.Router();

//Setup validation
const { check, validationResult } = require('express-validator');

router.get('/register', (req, res) => {
    res.render('register');
})

module.exports = router;