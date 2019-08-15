const mongoose = require("mongoose");
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;
//User Schema
const UserLogSchema = mongoose.Schema({
	userId:{
		type: ObjectId,
		required: true,
	},
	type:{
		type: String,
		required: true
	},
	detailId:{
		type: ObjectId,
		required: true
	}
});

module.exports = mongoose.model("UserLog", UserLogSchema, "userLogs");