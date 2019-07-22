const mongoose = require('mongoose');

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
        type: String,
        default: 'user'
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