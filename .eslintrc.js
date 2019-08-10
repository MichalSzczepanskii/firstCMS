module.exports = {
	"extends": "airbnb-base",
	"env": {
		"browser": true,
		"commonjs": true,
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"globals": {
		"Atomics": "readonly",
		"SharedArrayBuffer": "readonly"
	},
	"parserOptions": {
		"ecmaVersion": 2018
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"windows"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"keyword-spacing":[
			"error"
		],
		"object-property-newline":[
			"error"
		],
		"object-curly-newline":[
			"error",
			{ "multiline": true,
			 "consistent": true,
			 "minProperties": 1 }
		],
		"curly":[
			"error"
		],
		"prefer-const":[
			"error"
		]
	}
};