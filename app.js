
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')

  , config = require('./config.json')
  , api = require('./api')(config)
  , routes = require('./routes')
  , view = require('./routes/view')
  , control = require('./routes/control')
  ;

var app = express();

app.configure(function(){
  app.set('port', config.port || process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(config.session_secret || ""));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.param('game_id', api.find_game);

app.get('/', routes.index);
app.get('/view/', view.search);
app.get('/view/:game_id', view.show);
app.get('/view/:game_id/:session_id', view.show);

app.get('/control/new', control.create);
app.post('/control/new', control.create_process);

app.get('/control/:game_id', control.show);
app.get('/control/:game_id/:session_id', control.show);
app.get('/control/:game_id/clone', control.create);
app.post('/control/:game_id/clone', control.create_process);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
