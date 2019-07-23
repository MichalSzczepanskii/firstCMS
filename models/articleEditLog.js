const mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
//User Schema
const ArticleEditLogSchema = mongoose.Schema({
    articleId:{
        type: ObjectId,
        required: true,
    },
    authorId:{
        type: ObjectId,
        require: true,
    },
    editedBy:{
        type: ObjectId,
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