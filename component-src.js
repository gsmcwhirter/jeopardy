var socket_engine = require("engine.io")
	, json = require('json')
	, events = require('event')
	, query = require('query')
	, overlay = require('overlay')
	, dialog = require('dialog')
	;

var the_overlay;

function show_overlay(){
  the_overlay && the_overlay.hide();
  the_overlay = overlay();
  the_overlay.show();
}

function hide_overlay(){
  the_overlay && the_overlay.hide();
}

function socket_publish(socket, data){
	if (socket.readyState === "closed"){
		socket.open();
	}

	console.log(data);

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

		// function clearDias(callback){
		// 	callback = callback || function (){};
		// 	for (var key in dias){
		// 		if (dias[key]){
		// 			dias[key].once('hide', function (){
		// 				callback();
		// 			})

		// 			dias[key].hide();
		// 		}
		// 	}

		// 	callback();
		// }

		socket.onopen = function (){
		  socket.onmessage = socket_receiver(function (err, data){
		  	console.log(data);

		  	if (data.type === "registered"){
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "pong"){
		  		console.log("pong");
		  		clientData.registered_id = data.data;
		  	}

		  	if (data.type === "display"){
		  		console.log(data);
		  		var ids = "c" + (data.category || -1) + "q" + (data.question || -1);
		  		console.log(ids);

		  		if (dias[ids]){
		  			console.log(dias[ids]);
		  			dias[ids].show();
		  		}
		  		else {
		  			console.log("no dias[ids]");
		  		}
		  	}

		  	if (data.type === "clear"){
		  		console.log(dias);
					var ids = "c" + (data.category || -1) + "q" + (data.question || -1);

		  		if (dias[ids]){
		  			dias[ids].hide();
		  		}
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

		var els = query.all(".category>.question");
		for (var i in els){
			var el = els[i];

			console.log(el);

			if (typeof el !== "object")  break;

			var ci = -1
				, qi = -1
				;

			var matches = (el.id || "").match(/c(\d+)q(\d+)/);
			if (matches && matches.length && matches.length > 2){
				ci = matches[1];
				qi = matches[2];
			}

			console.log(ci);
			console.log(qi);

			function new_dia2(el){
				var dia = dialog("For " + el.innerText + " points:", query('.qtext', el));
				dia.effect('scale');
				//dia.overlay();
				dia.modal();
				dia.addClass('dia-question');
				dia._autohidden = false;

				MathJax.Hub.Queue(["Typeset",MathJax.Hub,dia.el[0]]);

				function newcdia2(el){
					var closedia = function (){
						if (!this._autohidden){
							this._autohidden = true;
							return;
						}

						//query('.value>a', el).style.display = 'none';
						query('.value', el).innerHTML = "&nbsp;";
						hide_overlay();
					};
					
					return closedia;
				}

				var handler = newcdia2(el);

				dia.on('show', function (){
          show_overlay();
				})
				dia.on('hide', handler);	
				dia.on('close', handler);

				return dia;
			}

			dias[el.id] = new_dia2(el);
		}

		console.log(dias);

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

		console.log("add listeners");
		var els = query.all(".category>.question");
		console.log(els);
		for (var i in els){
			var el = els[i];

			//console.log(typeof el);

			if (typeof el !== "object") break;

			console.log(el);
			var ci = -1
				, qi = -1
				;
			var matches = (el.id || "").match(/c(\d+)q(\d+)/);
			if (matches && matches.length && matches.length > 2){
				ci = matches[1];
				qi = matches[2];
			}

			console.log(ci);
			console.log(qi);

			function new_dia(el, c, q){
				var dia = dialog("For " + el.innerText + " points:", query('.qtext', el));
				dia.closable();
				dia.effect('scale');
				//dia.overlay();
				dia.addClass('dia-question-answer');

				console.log("MJ:", dia.el[0]);
				MathJax.Hub.Queue(["Typeset",MathJax.Hub,dia.el[0]]);

				function newcdia(el){
					var closedia = function (){
						console.log("Closing");
						//query('.value>a', el).style.display = 'none';
						query('.value', el).innerHTML = "&nbsp;";
            hide_overlay();
						socket_publish(socket, {type: "clear", game_id: game_id, session_id: session_id, category: c, question: q});
					};

					return closedia;
				}

				var handler = newcdia(el);

				dia.on('show', show_overlay);
				dia.on('escape', handler);
				dia.on('close', handler);

				return dia;
			}

			events.bind(query('.value>a', el), 'click', (function (c, q, dial){ 
				return function (e){
					console.log('click');
					console.log(c);
					console.log(q);
					e.preventDefault();
					//open stuff
					socket_publish(socket, {type: "display", game_id: game_id, session_id: session_id, category: c, question: q});
					dial.show();
				};
			})(ci, qi, new_dia(el, ci, qi)));	
		}

		return socket;
	}
}