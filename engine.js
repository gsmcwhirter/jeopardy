function Engine(api){
	this.api = api;
	this.games = {};
}

module.exports = Engine;

Engine.prototype.publish = function (socket, data){
	socket.send(JSON.stringify(data));
};

Engine.prototype.register = function (game_id, session_id, type, socket, callback){
	callback = callback || function (){};
	var self = this;
	var error;
	if (!game_id || !session_id){
		error = {type: "error", data: "missing ids"};
		this.publish(socket, error);
		callback(error);
		return;
	}

	if (!this.games[game_id]){
		this.games[game_id] = {game: null, sessions: {}};

		this.api.find_game(game_id, function (err, doc){
			if (err){
				self.publish(socket, {type: "error", data: err});
				callback(err);
			}
			else {
				self.games[game_id].game = doc;

				cont.apply(self);
			}
		});
	}
	else {
		cont.apply(self);
	}

	function cont(){
		if (!this.games[game_id].game){
			callback({type: "error", data: "game not found"});
			return;
		}

		if (!this.games[game_id].sessions[session_id]){
			this.games[game_id].sessions[session_id] = {
				viewers: []
			, controllers: []
			};
		}

		var ret = false;

		if (type === "view"){
			this.games[game_id].sessions[session_id].viewers.push({socket: socket, last_activity: Date.now()});
			ret = this.games[game_id].sessions[session_id].viewers.length - 1;
		}
		else if (type === "control"){
			this.games[game_id].sessions[session_id].controllers.push({socket: socket, last_activity: Date.now()});
			ret = this.games[game_id].sessions[session_id].controllers.length - 1;
		}
		
		if (ret || ret === 0){
			this.publish(socket, {type: "registered", data: ret});	
			callback();
		}
		else {
			var e2 = {type: "error", data: "could not register"}
			this.publish(socket, e2);
			callback(e2);
		}
	}
};

Engine.prototype.ping = function (game_id, session_id, type, socket, callback){
	var i, ct, thing, error;
	if (this.games[game_id]){
		if (this.games[game_id].sessions && this.games[game_id].sessions[session_id]){
			if (type === "view" && this.games[game_id].sessions[session_id].viewers){
				ct = this.games[game_id].sessions[session_id].viewers.length;
				for (i = 0; i < ct; i++){
					thing = this.games[game_id].sessions[session_id].viewers[i];
					if (thing && thing.socket == socket){
						this.publish(socket, {type: "pong", data: i});
						thing.last_activity = Date.now();
						callback();
						return;
					}
				}

				error = {type: "close", data: "socket not registered"};
				this.publish(socket, error);
				callback(error);
			}
			else if (type === "control" && this.games[game_id].sessions[session_id].controllers){
				ct = this.games[game_id].sessions[session_id].controllers.length;
				for (i = 0; i < ct; i++){
					thing = this.games[game_id].sessions[session_id].controllers[i];
					if (thing && thing.socket == socket){
						this.publish(socket, {type: "pong", data: i});
						thing.last_activity = Date.now();
						callback();
						return;
					}
				}

				error = {type: "close", data: "socket not registered"};
				this.publish(socket, error);
				callback(error);
			}
			else{
				error = {type: "close", data: "socket not registered"};
				this.publish(socket, error);
				callback(error);
				return;
			}
		}
		else {
			error = {type: "close", data: "session not found"};
			this.publish(socket, error);
			callback(error);
			return;	
		}
	}
	else {
		error = {type: "close", data: "game not found"};
		this.publish(socket, error);
		callback(error);
		return;
	}
};

Engine.prototype.send_test = function (game_id, session_id, socket, data, callback){
	var self = this;
	var i, ct, thing, error;
	if (this.games[game_id]){
		if (this.games[game_id].sessions && this.games[game_id].sessions[session_id]){
			if (this.games[game_id].sessions[session_id].controllers){
				ct = this.games[game_id].sessions[session_id].controllers.length;
				for (i = 0; i < ct; i++){
					thing = this.games[game_id].sessions[session_id].controllers[i];
					if (thing.socket == socket){
						(this.games[game_id].sessions[session_id].viewers || []).forEach(function (viewer){
							if (viewer){
								self.publish(viewer.socket, {type: "test", data: data});	
							}
						});

						thing.last_activity = Date.now();
						callback();
						return;
					}
				}

				error = {type: "close", data: "socket not registered"};
				this.publish(socket, error);
				callback(error);
			}
			else{
				error = {type: "close", data: "socket not registered"};
				this.publish(socket, error);
				callback(error);
				return;
			}
		}
		else {
			error = {type: "close", data: "session not found"};
			this.publish(socket, error);
			callback(error);
			return;	
		}
	}
	else {
		error = {type: "close", data: "game not found"};
		this.publish(socket, error);
		callback(error);
		return;
	}
};

Engine.prototype.closeSocket = function (socket){
	for (var gid in this.games){
		for (var sid in this.games[gid].sessions){
			var vlen = this.games[gid].sessions[sid].viewers.length;
			var clen = this.games[gid].sessions[sid].controllers.length;

			var i;
			for (i = 0; i < vlen; i++){
				if (this.games[gid].sessions[sid].viewers[i] && this.games[gid].sessions[sid].viewers[i].socket == socket){
					this.games[gid].sessions[sid].viewers[i] = null;
				}
			}

			for (i = 0; i < clen; i++){
				if (this.games[gid].sessions[sid].controllers[i] && this.games[gid].sessions[sid].controllers[i].socket == socket){
					this.games[gid].sessions[sid].controllers[i] = null;
				}
			}
		}
	}
};

Engine.prototype.cleanSockets = function (){
	var self = this;
	var games_to_delete = [];
	for (var gid in this.games){
		var sessions_to_delete = [];
		for (var sid in this.games[gid].sessions){
			this.games[gid].sessions[sid].viewers = this.games[gid].sessions[sid].viewers.filter(function (viewer){return viewer && (Date.now() - viewer.last_activity < 60*60*1000);});
			this.games[gid].sessions[sid].viewers.forEach(function (viewer, index){
				self.publish(viewer.socket, {type: "update_id", data: index});
			});

			this.games[gid].sessions[sid].controllers = this.games[gid].sessions[sid].controllers.filter(function (controller){return controller && (Date.now() - controller.last_activity < 60*60*1000);});
			this.games[gid].sessions[sid].controllers.forEach(function (controller, index){
				self.publish(viewer.socket, {type: "update_id", data: index});
			});

			if (this.games[gid].sessions[sid].viewers.length === 0 && this.games[gid].sessions[sid].controllers.length === 0){
				sessions_to_delete.push(sid);
			}
		}

		sessions_to_delete.forEach(function (session){
			delete this.games[gid].sessions[session];
		});

		if (Object.keys(this.games[gid].sessions).length === 0){
			games_to_delete.push(gid);
		}
	}

	games_to_delete.forEach(function (game){
		delete this.games[game];
	});
};