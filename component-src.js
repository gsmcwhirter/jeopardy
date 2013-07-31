var socket_engine = require("engine.io")
	, json = require('json')
	, events = require('event')
	, query = require('query')
	//, overlay = require('overlay')
	, dialog = require('dialog')
	;

function socket_publish(socket, data){
	if (socket.readyState === "closed"){
		socket.open();
	}

	socket.send(json.stringify(data));
}

function socket_receiver(callback){
	callback = callback || function (){};

	return function (data){
		data = json.parse(data);
		if (!data || !data.type || data.type === "error"){
			callback(data ? data : "no data", null);
		}
		else {
			callback(null, data);
		}
	}
}

var clientData = {};

function socket_register(socket, game_id, session_id, role){
	var registration = {type: "register", game_id: game_id, session_id: session_id, role: role};
	//console.log(registration);
	socket_publish(socket, registration);
}

module.exports = {
	clientData: clientData
, initViewer: function (server, game_id, session_id){
		var socket = socket_engine(server);

		dias = {};

		function clearDias(){
			for (var key in dias){
				dias[key].hide();
			}
		}

		socket.onopen = function (){
		  socket.onmessage = socket_receiver(function (err, data){
		  	
		  	//console.log(data);
		  	if (data.type === "registered"){
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "pong"){
		  		console.log("pong");
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "display"){
		  		var ids = "#c" + (data.category || -1) + "q" + (data.question || -1);

		  		if (dias[ids]){
		  			clearDias();
		  			dias[ids].show();
		  		}
		  	}

		  	if (data.type === "clear"){
		  		clearDias();
		  	}

		  	if (data.type === "test"){
		      console.log(data.data);
		    }

		  	if (data.type === "close"){
		  		if (data.data === "socket not registered" || data.data === "game not found"){
		  			//console.log("Trying to register");
		  			socket_register(socket, game_id, session_id, "view");
		  		}
		  		else {
		  			socket.close();
		  		}
		  	}
		  });

		  socket.onclose = function (){
		    console.log("socket closed");
		  };
		};

		var pingfunc = function (){
			var ping = {type: "ping", game_id: game_id, session_id: session_id, role: "view"};
			console.log("ping");
			//console.log(ping);
			socket_publish(socket, ping);
		};

		var ping = setInterval(pingfunc, 10000);
		setTimeout(pingfunc, 200);

		query.all(".category>.question").forEach(function (el){
			var ci = -1,qi = -1;
			var matches = (el.id || "").match(/c(\d+)q(\d+)/);
			if (matches && matches.length && matches.length > 2){
				ci = matches[1];
				qi = matches[2];
			}

			var dia = dialog(el.innerText, query('.qtext', el).innerHTML);
			dia.effect('scale');
			dia.overlay();
			dia.addClass('dia-question')

			dias[el.id] = dia;

			var closedia = function (){
				query('.value>a', el).style.display = 'none';
			};

			dia.on('escape', closedia);
			dia.on('close', closedia);	
		});

		return socket;
	}
, initController: function (server, game_id, session_id){
		var socket = socket_engine(server);

		socket.onopen = function (){
		  socket.onmessage = socket_receiver(function (err, data){
		  	
		  	//console.log(data);
		  	if (data.type === "registered"){
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "pong"){
		  		console.log("pong");
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "close"){
		  		if (data.data === "socket not registered" || data.data === "game not found"){
		  			socket_register(socket, game_id, session_id, "control");
		  		}
		  		else {
		  			socket.close();
		  		}
		  	}
		  });

		  socket.onclose = function (){
		    console.log("socket closed");
		  };
		};

		var pingfunc = function (){
			var ping = {type: "ping", game_id: game_id, session_id: session_id, role: "control"};
			console.log("ping");
			//console.log(ping);
			socket_publish(socket, ping);
		};

		var ping = setInterval(pingfunc, 10000);
		setTimeout(pingfunc, 200);

		query.all(".category>.question").forEach(function (el){
			var ci = -1,qi = -1;
			var matches = (el.id || "").match(/c(\d+)q(\d+)/);
			if (matches && matches.length && matches.length > 2){
				ci = matches[1];
				qi = matches[2];
			}

			var dia = dialog(el.innerText, query('.qtext', el).innerHTML);
			dia.closeable();
			dia.effect('scale');
			dia.overlay();
			dia.addClass('dia-question-answer')

			var closedia = function (){
				query('.value>a', el).style.display = 'none';
				socket_publish(socket, {type: "clear", game_id: game_id, session_id: session_id});
			};

			dia.on('escape', closedia);
			dia.on('close', closedia);

			events.bind(query('.value>a', el), 'click', function (e){
				e.preventDefault();
				//open stuff
				socket_publish(socket, {type: "display", game_id: game_id, session_id: session_id, category: ci, question: qi});
				dia.show();
			});	
		});

		return socket;
	}
}