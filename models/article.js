const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const ArticleSchema = mongoose.Schema({
	title:{
		type: String,
		required: true
	},
	author:{
		type: ObjectId,
		require: true
	},
	content:{
		type: String,
		require: true
	},
	date:{
		type: Date,
		default: new Date()
	},
	displayed:{
		type: Boolean,
		default: true
	}
});

module.exports = mongoose.model("Article", ArticleSchema, "articles");