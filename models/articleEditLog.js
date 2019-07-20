const mongoose = require('mongoose');

//User Schema
const ArticleEditLogSchema = mongoose.Schema({
    articleId:{
        type: String,
        required: true,
    },
    authorId:{
        type: String,
        require: true,
    },
    editedBy:{
        type: String,
        require: true,  
    },
    reason:{
        type: String,
        required: true
    },
    date:{
        type: Date,
        default: new Date()
    }
})

const User = module.exports = mongoose.model('ArticleEditLog', ArticleEditLogSchema, 'articleEditLog');