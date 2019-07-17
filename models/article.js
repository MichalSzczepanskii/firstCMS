const mongoose = require('mongoose');

//User Schema
const ArticleSchema = mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    author:{
        type: String,
        require: true
    },
    content:{
        type: String,
        require: true
    }
})

const User = module.exports = mongoose.model('Article', ArticleSchema, 'articles');