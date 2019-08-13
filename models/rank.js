const mongoose = require("mongoose");
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
	giveBan:{
		type: Boolean,
		require: true
	},
	giveWarn:{
		type: Boolean,
		require: true
	},
	blockAdding:{
		type: Boolean,
		require: true
	}
});
module.exports = mongoose.model("Rank", RankSchema, "ranks");