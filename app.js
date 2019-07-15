const express = require('express');
const path = require('path');

const app = express();

//View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','pug');

//Setup public folder
app.use(express.static(path.join(__dirname,'public')));

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