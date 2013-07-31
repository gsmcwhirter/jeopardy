var couchapp = require('couchapp')
	, path = require('path')
	;

var ddoc = {
	_id: '_design/jeopardy'
, views: {}
, lists: {}
, shows: {}
// , rewrites : 
//     [ {from:"/", to:'index.html'}
//     , {from:"/api", to:'../../'}
//     , {from:"/api/*", to:'../../*'}
//     , {from:"/*", to:'*'}
//     ]
//   }
, validate_doc_update: function (newDoc, oldDoc, userCtx){
		function require(field, message) {
      message = message || "Document must have a " + field;
      if (!newDoc[field]) throw({forbidden : message});
    };

    function requireValue(field, values, message) {
    	message = message || "Document's " + field + " field must have a value in '" + (values || []).join(", ") + "'";
    	if (values.indexOf(newDoc[field]) === -1) throw({forbidden: message});
    };

		if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
	    throw {forbidden: "Only admin can delete documents on this database."};
	  }

	  requireValue('type', ['game']);
	}
};

module.exports = ddoc;

/*
Expected Game Schema

{
   "_id": "72dab3f6668b30b5b956a3860b0003a3",
   "_rev": "1-b9fcb774155a8963f8a0775f665dccf0",
   "type": "game",
   "title": "Game Name",
   "keywords": [
       "word1",
       "word2",
       "word3"
   ],
   "categories": [
       {
           "name": "Cat 1",
           "order": 0,
           "questions": [
               {
                   "question": "What is your Name?",
                   "answer": "King Arthur",
                   "value": 100
               },
               {
                   "question": "What is your Quest?",
                   "answer": "To Find the Holy Grail",
                   "value": 200
               }
           ]
       },
       {
           "name": "Cat 2",
           "order": 1,
           "questions": [
           ]
       }
   ],
   "author": "Me",
   "created_on": "Today",
   "hidden": false
}

*/

ddoc.views.by_keyword = {
	map: function (doc){
		if (doc.type === "game" && !doc.hidden){
			(doc.keywords || []).forEach(function (word){
				emit(word.toLowerCase(), doc.title);
			});
		}
	}
, reduce: function (keys, values, rereduce){
		if (rereduce){
			return sum(values);
		}
		else {
			return values.length;
		}
	}
};

ddoc.views.by_title = {
	map: function (doc){
		if (doc.type === "game" && !doc.hidden){
			emit(doc.title.toLowerCase(), doc.title);
		}
	}
};

ddoc.views.by_id = {
	map: function (doc){
		if (doc.type === "game" && !doc.hidden){
			emit(doc._id, doc.title || "");
		}
	}
};

couchapp.loadAttachments(ddoc, path.join(__dirname, '_attachments'));