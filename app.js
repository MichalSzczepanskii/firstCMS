const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');

const config = require('./config/database');

const app = express();

//Database
mongoose.connect(config.database,{ useNewUrlParser: true});
let db = mongoose.connection;

db.once('open', () => console.log('Connected to MongoDB'));
db.on('error', (err) => console.log(err));

//View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','pug');

//Body Parser Middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//Setup public folder
app.use(express.static(path.join(__dirname,'public')));

//Session middleware
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

//Flash Middleware
app.use(flash());

//Messages middleware
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});

//Passport Config
require('./config/passport')(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Global Variable For User Session
app.get('*', (req, res, next) =>{
  res.locals.user = req.user || null;
  next();
})

//Home route
app.get('/',(req, res) => {
    res.render('index');
})

//Route files
const users = require('./routes/users');

app.use('/users', users);

//Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));