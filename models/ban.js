const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const BanDetailsSchema = mongoose.Schema({
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
	endDate:{
		type: Date,
		required: true
	}
});

module.exports = mongoose.model("BanDetailsSchema", BanDetailsSchema, "banDetails");