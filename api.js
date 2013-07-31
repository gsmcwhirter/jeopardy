var http = require('http')
  , url = require('url')
  , qs = require('querystring')
  ;

function encodeOptions (options) {
    if (typeof(options) == "object" && options !== null) {
    	for(var name in options){
    		var val = options[name];
    		if (!options.hasOwnProperty(name)) continue;
            switch (name){
                case "key":
                case "startkey":
                case "endkey":
                case "include_docs":
                case "descending":
                case "reduce":
                case "group":
                    options[name] = (val !== null) ? JSON.stringify(val) : null;
                    break;
                default:
                    break;
            }
    	}
    }
    
    return "?" + qs.stringify(options);
}

function CouchDB(config){
    this.host = config.couch_host;
    this.db = config.couch_db;
    this.use_auth = config.couch_use_auth;
    if (this.use_auth){
        this.user = config.couch_user;
        this.pass = config.couch_pass;
    }
}

CouchDB.prototype.request = function (method, uri, options, callback, sendchunks){
    var responseText = '';

    options = options || {};

    if (typeof(options) == "function")
    {
        sendchunks = callback, callback = options, options = {};
    }

    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || options.headers["content-type"] || "application/json";
    options.headers["Accept"] = options.headers["Accept"] || options.headers["accept"] || "application/json";

    var uuid_check = url.parse(uri);
    if (uuid_check.pathname != '/_uuids'){
        uri = this.db+uri;
    }
    else {
        uri = this.host+uri;
    }

    var myurl = url.parse(uri);
    var host;
    switch (myurl.protocol) {
        case 'http:':
            host = myurl.hostname;
            break;

        case undefined:
        case '':
            host = "localhost";
            break;

        case 'https:':
            throw "SSL is not implemented.";
            break;

        default:
            throw "Protocol not supported.";
    }

    var port = myurl.port || 80;
    if (myurl.search)
    {
        uri = myurl.pathname + myurl.search;
    }
    else
    {
        uri = myurl.pathname;
    }

    options.headers["Host"] = host;

    if (method == "GET" || method == "HEAD") {
        options.data = null;
    } else if (options.data) {
        options.headers["Content-Length"] = options.data.length;

        if (!options.headers["Content-Type"]) {
            options.headers["Content-Type"] = "application/json;charset=UTF-8";
        }
    }

    var req_options = {
        host: host,
        port: port,
        method: method,
        path: uri,
        headers: options.headers
    };

    if (this.use_auth){
        req_options.auth = this.user + ":" + this.pass;
    }

    var request = http.request(req_options, function (response){
        response.setEncoding('utf8');
        response.on("data", function(chunk){
            if (sendchunks){
                var resp;
                try {
                    resp = JSON.parse(chunk);
                }
                catch (err){
                    resp = false;
                }

                callback(null, resp);
            }
            else {
                responseText += chunk;
            }
        });
        response.on("end", function(){
        		//console.log(responseText);
            if (!sendchunks){
                var resp;
                try{
                    resp = JSON.parse(responseText);
                } catch (err){
                    resp = false;
                }

                callback(null, resp);
            }
        });
    });

    if (options.data) request.write(options.data);

    request.end();
};

CouchDB.prototype.getIDs = function (how_many, callback){
    if (typeof(how_many) == 'function')
    {
        callback = how_many, how_many = 1;
    }

    how_many = parseInt(how_many) || 1;

    this.request("GET", "/_uuids?count="+how_many, function (resp){
        if (resp.uuids)
        {
            callback(null, resp.uuids);
        }
        else
        {
            callback(resp);
        }
    });
}

CouchDB.prototype.changes = function (options, ondata){
    if (typeof options == "function") ondata = options, options = "";

    this.request("GET", "/_changes"+(options || ""), {headers: {"Connection": "keep-alive"}}, ondata, true);
}

function Game(doc){
	this._doc = doc;
	this.title = doc.title;
	this.keywords = doc.keywords;

	this._resetCategories();
};

Game.prototype._resetCategories = function (){
	this.categories = this._doc.categories;

	this._sortCategories();
};

Game.prototype._sortCategories = function (){
	this.categories.sort(function (a,b){return a.order < b.order ? -1 : 1;});
	for (var i = 0; i < this.categories.length; i++){
		this.categories[i].questions.sort(function (a,b){return a.value < b.value ? -1 : 1;});
	}
};

module.exports = function (settings){
	var api = {};

	api.couchdb = new CouchDB(settings);

	function cdb_cb (callback){
		return function (err, response){
			//console.log(response);
			if (err || !response || response.error || typeof(response.rows) === "undefined"){
				callback(err || (response ? response.error : false) || {error: "No rows property on the response."});
			}

			else {
				callback(null, response.rows);
			}
		};
	}

	api.query_id = function (options, callback){
		if (typeof(options) == "function") { callback = options, options = {}; }

		api.couchdb.request("GET", "/_design/jeopardy/_view/by_id/" + encodeOptions(options), cdb_cb(callback));
	};

	api.query_keyword = function (keyword, options, callback){
		if (typeof(options) == "function") { callback = options, options = {}; }
		if (typeof options.group == "undefined") options.group = false;

		api.couchdb.request("GET", "/_design/jeopardy/_view/by_keyword/" + encodeOptions(options), cdb_cb(callback));
	};

	api.count_keyword = function (keyword, options, callback){
		if (typeof(options) == "function") { callback = options, options = {}; }
    if (typeof options.group == "undefined") options.group = true;

    api.couchdb.request("GET", "/_design/jeopardy/_view/by_keyword/" + encodeOptions(options), cdb_cb(callback));
	};

	api.query_title = function (title, options, callback){
		if (typeof(options) == "function") { callback = options, options = {}; }

		api.couchdb.request("GET", "/_design/jeopardy/_view/by_title/" + encodeOptions(options), cdb_cb(callback));
	};

	api.find_game = function (req, res, next, game_id){
		api.query_id({key: game_id, include_docs: true}, function (err, rows){
			//console.log(err);
			//console.log(rows);
			if (err){
				next(err);
			}
			else if (rows.length === 0){
				next(new Error("Game not found"));
			}
			else {
				//console.log("here");
				req.game = new Game(rows[0].doc);
				next();
			}
		});
	};

	return api;
};