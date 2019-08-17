const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const WarnDetailsSchema = mongoose.Schema({
	userId:{
		type: ObjectId,
		required: true,
	},
	authorId:{
		type: ObjectId,
		required: true,
	},
	date:{
		type: Date,
		default: new Date()
	},
	reason:{
		type: String,
		required: true
	},
});

module.exports = mongoose.model("WarnDetailsSchema", WarnDetailsSchema, "warnDetails");