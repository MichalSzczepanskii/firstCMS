const mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
//User Schema
const UserSchema = mongoose.Schema({
    username:{
        type: String,
        required: true
    },
    email:{
        type: String,
        require: true
    },
    type:{
        type: ObjectId,
        default: "5d430b20b6d4219b1d45893c"
    },
    password:{
        type: String,
        required: true
    },
    email:{
        type: String,
        require: true
    },
    registerDate:{
        type: Date,
        default: new Date
    }
})

const User = module.exports = mongoose.model('User', UserSchema, 'users');