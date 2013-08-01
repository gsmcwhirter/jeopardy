var shortid = require("shortid");

exports.create = function (req, res){
	res.end("Create!");
};

exports.create_process = function (req, res){
	res.end("Process!");
};

exports.show = function (req, res){
	if (!req.game_session){
		//create new game session
		var game_session = shortid.generate();
		req.game_session = game_session;

		res.redirect("control/" + req.game._doc._id + "/"+game_session);
	}
	else {
		res.render('control', { title: req.game.title, ws_domain: req.app.get('ws_domain'), game: req.game, game_session: req.game_session });
	}
};