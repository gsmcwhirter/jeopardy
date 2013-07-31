var path = require('path')
  , config = require('./config.json')
  ;  

module.exports = function (grunt){
  grunt.initConfig({
    component: {
      install: {
        options: {
          action: 'install'
        }  
      }
    , build: {
        options: {
          action: 'build'
        }
      }
    }
  , copy: {
      js: {
        files: [
          {src: "build/build.js", dest: "public/javascripts/build.js"}
        ]
      }
    , css: {
        files: [
          {src: "build/build.css", dest: "public/stylesheets/build.css"}
        ]
      }
    }
  , clean: ["build", "components", "public/javascripts/build.js", "public/stylesheets/build.css"]
  , forever: {
      options: {
        index: 'app.js'
      , silent: false
      , forever: true
      , uid: config.uid || null
      , max: 10
      , env: {
          NODE_ENV: process.env.environment || config.environment || 'development'
        , host: process.env.host || config.host || 'INADDR_ANY'
        , port: process.env.port || config.port || 3000
        , procs: process.env.procs || config.procs || 1  
        }
      , rawLogDir: true
      , logDir: config.logDir || path.join(process.cwd(), "log")
      , logFile: "forever.log"
      , outFile: "out.log"
      , errFile: "error.log"
      , appendLog: true
      }
    }
  , mkcouchdb: {
      main: {
        db: config.couch_db
      }
    }
  , couchapp: {
      main: {
        db: config.couch_db
      , app: './couch/couch.js'
      }
    }
  });
  
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  //grunt.loadNpmTasks("grunt-contrib-stylus");
  //grunt.loadNpmTasks("grunt-contrib-jade");
  grunt.loadNpmTasks("grunt-component");
  //grunt.loadNpmTasks("grunt-contrib-jshint");
  //grunt.loadNpmTasks("grunt-mkdir");
  grunt.loadNpmTasks("grunt-forever");
  grunt.loadNpmTasks("grunt-couchapp");
  
  //grunt.registerTask("default", ["mkdir", "jade", "stylus", "component:install", "component:build", "copy:fonts", "copy:css", "copy:js"]);
  grunt.registerTask("default", ["component:install", "component:build", "copy:css", "copy:js"]);
}
