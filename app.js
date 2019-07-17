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

//Bring in models
const Article = require('./models/article');
const User = require('./models/user');

//Home route
app.get('/',(req, res) => {
    Article.aggregate(
      [{$project: 
        {
        "title": "$title", 
        "author": {$toObjectId: "$author"},
        "date": "$date" ,
        "short": {$substr: ["$content", 0, 750]}
        }
      },
      {
        $lookup: {
          from: "users", 
          localField: "author", 
          foreignField: "_id", 
          as: "user"
        }
      },
      {$project: 
        {
        "title": 1, 
        "author": "$user.username",
        "author_id": "$user._id",
        "date": 1 ,
        "short": 1}
      },
      {$sort: {date: -1}}
      ]
  , (err, articles) =>{
      if (err){
        console.log(err);
      }else{
        res.render('index',{
          articles
        })
      }
    });
    
})

app.locals.ucfirst = function(value){
  return value.charAt(0).toUpperCase() + value.slice(1);
};

//Route files
const users = require('./routes/users');
const articles = require('./routes/articles');

app.use('/users', users);
app.use('/articles', articles);

//Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));