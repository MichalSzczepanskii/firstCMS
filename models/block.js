const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const BlockDetailsSchema = mongoose.Schema({
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
		default: new Date()
	}
});

module.exports = mongoose.model("BlockDetailsSchema", BlockDetailsSchema, "blockDetails");