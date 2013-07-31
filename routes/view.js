exports.show = function (req, res){
	res.render('view', { title: req.game.title, game: req.game });
	//res.end("<html><body>Game!<br/><br/><pre>"+JSON.stringify(req.game, null, 4)+"</pre></body></html>");
};

exports.search = function (req, res){
	res.end("Search!");
};