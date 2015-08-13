var express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    fs = require("fs"),
    bunyan = require("bunyan"),
    Entity = require('./Entity'),
    Errors = require('./Errors'),
    redis = require('basyt-redis-client'),
    Auth = require('./Auth');

module.exports = Basyt;

function Basyt() {
    //register basyt instance to process
    process.basyt = this;

    var config = GLOBAL.APP_CONFIG;
    var packageFile = config.package_file || config.base_folder + 'package.json';
    var entitiesFolder = config.basyt.entities_folder || config.base_folder + 'entities/';
    var controllersFolder = config.basyt.controllers_folder || config.base_folder + 'controllers/';
    var listenersFolder = config.basyt.listeners_folder || config.base_folder + 'listeners/';
    var projectInfo = require(packageFile);


    var log, access_log;
    log = bunyan.createLogger({name: projectInfo.name, streams: config.basyt.log_streams});
    access_log = bunyan.createLogger({name: projectInfo.name+"_access", streams: config.basyt.access_log_streams});

    GLOBAL.logger = log;
    GLOBAL.access_logger = access_log;

    //setup properties
    this.collections = {};
    this.ErrorDefinitions = Errors;

    //Create basyt express app instance
    this.app = express();

    //set body parser middlewares
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({
        extended: true
    }));

    //Start basyt express http server
    this.http_server = this.app.listen(config.basyt.port || 8080, function () {

        var host = process.basyt.http_server.address()
            .address;
        var port = process.basyt.http_server.address()
            .port;

        log.info('Listening at http://%s:%s', host, port);

    });

    //Create basyt socketio websocket server
    if (config.basyt.enable_ws !== false) {
        this.ws_server = require('socket.io')(this.http_server);
        log.info('Started websocket');
    }

    //Initialize CORS Middleware
    if (config.basyt.enable_cors === true && !_.isUndefined(config.basyt.cors)) {
        log.info('Installed CORS');
        this.app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', config.basyt.cors.origin);
            res.header('Access-Control-Allow-Methods', config.basyt.cors.methods || 'GET,PUT,POST,DELETE');
            if (!_.isUndefined(config.basyt.auth) && config.basyt.auth.method === 'jwt') {
                res.header('Access-Control-Allow-Headers', [].concat(['Content-Type', 'Authorization'], config.basyt.cors.headers));
            }
            next();
        });
    }

    this.truncateEntities = function () {
        _.forOwn(process.basyt.collections, function (entity) {
            log.info("Truncated %s", entity.name);
            entity.delete({}, {multi: true}).catch(function () {
                return;
            });
        });
    };

    var entityRoutings = [{}];

    //Initialize Auth
    if (config.basyt.enable_auth === true && !_.isUndefined(config.basyt.auth)) {
        log.info('Installed Auth');
        Auth.initialize(config.basyt.auth);
        var userEntity, userSettingsEntity;

        userEntity = new Entity('user', require.resolve('./user'));
        this.app.use((config.basyt.entity_path || '/') + 'user', userEntity.router);
        entityRoutings.push(userEntity.routing);

        userSettingsEntity = new Entity('user_settings', require.resolve('./user_settings'));
        this.app.use((config.basyt.entity_path || '/') + 'user_settings', userSettingsEntity.router);
        entityRoutings.push(userSettingsEntity.routing);

        if (config.basyt.enable_ws !== false) {
            //setup jwt auth for socket
            var socketioJwt = require("socketio-jwt");
            this.ws_server.on('connection', socketioJwt.authorize({
                secret: config.basyt.auth.secret_key,
                timeout: 15000 // 15 seconds to send the authentication message
            }));
        }
    }

    //Import entities
    if (fs.existsSync(entitiesFolder)) {
        log.info('Importing Entities');
        fs.readdirSync(entitiesFolder).forEach(function (file, index) {
            var entityName = file.toLowerCase().slice(0, -3),
                entityInstance = new Entity(entityName, entitiesFolder + file);
            log.info("%s. %s Entity is imported",(index + 1), entityName);
            this.app.use((config.basyt.entity_path || '/') + entityName, entityInstance.router);
            entityRoutings.push(entityInstance.routing);
        }, this);
    }

    //Import controllers
    if (fs.existsSync(controllersFolder)) {
        log.info('Importing Controllers');
        fs.readdirSync(controllersFolder).forEach(function (file, index) {
            var controllerName = file.toLowerCase().slice(0, -3),
                controllerActions = require(controllersFolder + file),
                router = express.Router(),
                routing = {};
            log.info("%s. %s Controller is imported", (index + 1), controllerName);
            _.forOwn(controllerActions, function (action, actionName) {
                //auth interceptor
                if (!_.isUndefined(action.auth_level)) {
                    router[action.method](action.path, Auth.getAuthInterceptor(action.auth_level));
                }
                //register interceptors
                if (_.isFunction(action.interceptors)) {
                    router[action.method](action.path, action.interceptors);
                }
                else if (_.isArray(action.interceptors)) {
                    _.forEach(action.interceptors, function (interceptor) {
                        if (_.isFunction(interceptor)) {
                            router[action.method](action.path, interceptor);
                        }
                    });
                }

                //register action
                router[action.method](action.path, action.action);

                //set routing
                routing[controllerName + ':' + actionName] = {
                    method: action.method.toUpperCase(),
                    path: '/' + controllerName + action.path,
                    auth_level: action.auth_level
                };
            });

            process.basyt.app.use((config.basyt.entity_path || '/') + controllerName, router);
            entityRoutings.push(routing);
        });
    }

    //Import listeners
    if (fs.existsSync(listenersFolder)) {
        this.redisClient = redis.createClient();
        log.info('Importing Listeners');
        this.listener_setups = {
            redis: {},
            redis_pattern: {},
            socket: {}
        };
        fs.readdirSync(listenersFolder).forEach(function (file, index) {
            var listenerName = file.toLowerCase().slice(0, -3),
                listener = require(listenersFolder + file),
                that = this;
            log.info("%s. %s Listener is imported", (index + 1), listenerName);
            _.forOwn(listener, function(setup, channel){
                if(_.isUndefined(this.listener_setups[setup.source || 'redis'][channel]))
                    this.listener_setups[setup.source || 'redis'][channel] = [];
                this.listener_setups[setup.source || 'redis'][channel].push(setup);
            }, this);


            _.forOwn(this.listener_setups.redis, function(setup_list, channel){
                this.redisClient.subscribe(channel);
            }, this);

            _.forOwn(this.listener_setups.redis_pattern, function(setup_list, channel){
                this.redisClient.psubscribe(channel);
            }, this);

            this.redisClient.onMessage(function(channel, data, pattern) {
                var setup_list = pattern
                    ? that.listener_setups.redis_pattern[pattern]
                    : that.listener_setups.redis[channel];

                for(var i = 0; i < setup_list.length; i++) {
                    if((!setup_list[i].eventName) || (setup_list[i].eventName === data.eventName)) {
                        if(!setup_list[i].match || _.isMatch(data.data, setup_list[i].match)){
                            setup_list[i].action(data.data, channel);
                        }
                    }
                }
            });

            if (config.basyt.enable_ws !== false) {
                var ws_start_event = config.basyt.enable_auth ? 'authenticated' : 'connection';
                this.ws_server.on('ws_start_event', function (socket) {
                    // socket initialization begins
                    socket.basytRedisClient = redis.createClient();
                    if(socket.decoded_token) {
                        socket.basytRedisClient.psubscribe('user:'+socket.decoded_token.id+':*');
                    }
                    socket.basytRedisClient.onMessage(function(channel, message) {
                        socket.emit(message.eventName, message.data);
                    });
                    socket.on('disconnect', function(){
                        socket.basytRedisClient.quit();
                    });
                    // socket initialization ends

                    // listener setups
                    _.forOwn(that.listener_setups.socket, function (setup_list, channel) {
                        for(var i = 0; i < setup_list.length; i++) {
                            if(_.isUndefined(socket.decoded_token) && setup_list[i].require_auth) continue;
                            if (setup_list[i].initialize) setup_list[i].initialize(socket);
                        }
                        socket.on(channel, function(data) {
                            for(var i = 0; i < setup_list.length; i++) {
                                if(_.isUndefined(socket.decoded_token) && setup_list[i].require_auth) continue;
                                if(!setup_list[i].match || _.isMatch(data, setup_list[i].match)){
                                    setup_list[i].action(data, socket);
                                }
                            }
                        })
                    });
                });
            }
        }, this);
    }

    this.app.use(function (err, req, res, next) {
        return res.status(err.statusCode || 500).json({success: false, err: err.err});
    });

    //Register discovery
    var started = new Date();
    if (config.basyt.disable_discovery !== true) {
        log.info('Enabled discovery');
        this.routing = _.extend.apply(_, entityRoutings);
        this.app.get('/', function (req, res) {
            return res.json({
                name: projectInfo.name,
                version: projectInfo.version,
                routes: process.basyt.routing,
                started: started,
                uptime: (Date.now() - Number(started)) / 1000
            });
        })
    }
    else {
        this.app.get('/', function (req, res) {
            res.send({
                name: projectInfo.name,
                version: projectInfo.version,
                started: started,
                uptime: (Date.now() - Number(started)) / 1000
            });
        });
    }

    process.on('uncaughtException', function (err) {
        // prevent infinite recursion
        process.removeListener('uncaughtException', arguments.callee);
        logger.fatal(err);
    });
}
