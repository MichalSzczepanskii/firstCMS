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
    password:{
        type: String,
        required: true
    },
    email:{
        type: String,
        require: true
    }
})

const User = module.exports = mongoose.model('User', UserSchema, 'users');