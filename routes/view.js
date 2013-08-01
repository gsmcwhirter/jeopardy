var shortid = require("shortid");

exports.show = function (req, res){
	if (!req.game_session){
		//create new game session
		var game_session = shortid.generate();
		req.game_session = game_session;

		res.redirect("view/" + req.game._doc._id + "/"+game_session);
	}
	else {
		res.render('view', { title: req.game.title, ws_domain: req.app.get('ws_domain'), game: req.game, game_session: req.game_session });
	}
	//res.end("<html><body>Game!<br/><br/><pre>"+JSON.stringify(req.game, null, 4)+"</pre></body></html>");
};

exports.search = function (req, res){
	res.end("Search!");
};