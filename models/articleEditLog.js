const mongoose = require('mongoose');

//User Schema
const ArticleEditLogSchema = mongoose.Schema({
    articleId:{
        type: ObjectId,
        required: true,
    },
    reason:{
        type: String,
        required: true
    },
    author:{
        type: String,
        require: true
    },
    date:{
        type: Date,
        default: new Date()
    }
})

const User = module.exports = mongoose.model('ArticleEditLog', ArticleEditLogSchema, 'articles');