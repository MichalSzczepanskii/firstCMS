const mongoose = require('mongoose');
const RankSchema = mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    addArticle:{
        type: Boolean,
        require: true
    },
    editArticle:{
        type: Boolean,
        require: true 
    },
    editUser:{
        type: Boolean,
        require: true
    },
    editRank:{
        type: Boolean,
        require: true
    },
})

const User = module.exports = mongoose.model('Rank', RankSchema, 'ranks');