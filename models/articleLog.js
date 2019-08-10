const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const ArticleLogSchema = mongoose.Schema({
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
	},
	action:{
		type: String,
		required: true
	},
	displayed:{
		type: Boolean,
		default: true
	}
});

module.exports = mongoose.model("ArticleLog", ArticleLogSchema, "articleLogs");