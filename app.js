
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , engine = require('engine.io')

  , config = require('./config.json')
  , api = require('./api')(config)
  , routes = require('./routes')
  , view = require('./routes/view')
  , control = require('./routes/control')

  , myengine = new (require('./engine'))(api)
  ;

var app = express();

app.configure(function(){
  app.set('port', config.port || process.env.PORT || 3000);
  app.set('ws_domain', "ws://" + (config.websocket_domain || "localhost") + ":" + app.get('port'));
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

console.log(app.get('ws_domain'));

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.param('game_id', api.find_game_middleware);
app.param('session_id', function (req, res, next, session_id){
  req.game_session = session_id;
  next();
});

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

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var eserver = engine.attach(server);

var util = require("util");

setInterval(function (){myengine.cleanSockets();}, 60 * 60 * 1000);

function debugEngine(){
  for (var gid in myengine.games){
    var game = myengine.games[gid];
    console.log(util.inspect(game.sessions, {depth: 3}));  
  }
}

eserver.on('connection', function (socket){
  socket.on('message', function (data){
    try {
      data = JSON.parse(data);  
    }
    catch (e){
      data = {};
    }

    if (data.type === "register"){
      myengine.register(data.game_id, data.session_id, data.role, socket, function (err){
        if (err){
          console.log(err);
        }
        debugEngine();
      });
    }

    if (data.type === "ping"){
      myengine.ping(data.game_id, data.session_id, data.role, socket, function (err){
        debugEngine();
      });
    }

    if (data.type === "display"){
      myengine.send_display(data.game_id, data.session_id, data.category, data.question, socket, function (err){});
    }

    if (data.type === "clear"){
      myengine.send_clear(data.game_id, data.session_id, data.category, data.question, socket, function (err){});
    }

    if (data.type === "test"){
      myengine.send_test(data.game_id, data.session_id, socket, data.data, function (err){});
    }
  });

  socket.on('close', function (){
    myengine.closeSocket(socket);
  });
});