var _ = require('lodash'), Auth = require('./Auth'), express = require('express'), Errors = require('./Errors');

module.exports = Entity;

var restActions = {
        'get': function (req, res) {
            if (req.isQuery === false) {
                return req.collection.read(req.entity_query, {depth: req.query.deep ? req.entity_query_options.depth : 0})
                    .then(function (entity) {
                        return res.json({success: true, result: entity});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
            else {
                _.forEach(req.collection.visible_fields, function (field) {
                    if (!_.isUndefined(req.query[field])) {
                        req.entity_query[field] = req.query[field];
                    }
                });
                return req.collection.query(req.entity_query, req.entity_query_options)
                    .then(function (list) {
                        return res.json({success: true, result: list, total: list.length});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        },
        'put': function (req, res) {
            var query;
            if (req.isQuery === false) {
                query = req.collection.update(req.entity_query, req.body.update, _.extend({}, req.body.query_options, req.entity_query_options));
            }
            else {
                var entity_query = _.extend({}, req.body.query, req.entity_query);
                if (req.action_name === 'search' && _.isString(req.query.q)) {
                    req.entity_query_options.search_text = req.query.q;
                }
                if (req.action_name === 'update_bulk' && !_.isUndefined(req.body.update)) {
                    query = req.collection.update(entity_query, req.body.update, _.extend({}, req.body.query_options, req.entity_query_options));
                }
                else {
                    query = req.collection.query(entity_query, _.extend({}, req.body.query_options, req.entity_query_options));
                }
            }
            return query
                .then(function (result) {
                    if (_.isArray(result)) {
                        return res.json({success: true, result: result, total: result.length});
                    }
                    else {
                        return res.json({success: true, result: result});
                    }

                })
                .catch(Errors.stdCatchFunction(res));
        },
        'post': function (req, res) {
            if (_.isUndefined(req.body.entity))
                throw new Errors.BasytError({message: 'Bad Request'}, 400);
            if (req.isQuery) {
                if (req.action_name !== 'create_bulk' && _.isArray(req.body.entity)) {
                    throw new Errors.BasytError({message: 'Bad Request'}, 400);
                }
                else {
                    return req.collection.create(req.body.entity)
                        .then(function (entity) {
                            if (_.isArray(entity)) {
                                return res.json({success: true, result: entity, total: entity.length});
                            }
                            else {
                                return res.json({success: true, result: entity, total: 1});
                            }
                        })
                        .catch(Errors.stdCatchFunction(res));
                }
            }
        },
        'delete': function (req, res) {
            if (req.isQuery !== false) {
                _.forEach(req.collection.visible_fields, function (field) {
                    if (!_.isUndefined(req.query[field])) {
                        req.entity_query[field] = req.query[field];
                    }
                });
            }
            if (_.isEmpty(req.entity_query)) {
                return res.status(400).json({success: false})
            }
            return req.collection.delete(req.entity_query)
                .then(function () {
                    return res.json({success: true});
                })
                .catch(Errors.stdCatchFunction(res));
        },
        'count': function (req, res) {
            var entity_query = _.extend({}, req.body.query, req.entity_query);
            if (req.action_name === 'search' && _.isString(req.query.q)) {
                req.entity_query_options.search_text = req.query.q;
            };
            return req.collection.count(entity_query, _.extend({}, req.body.query_options, req.entity_query_options))
                .then(function (count) {
                    return res.json({success: true, result: {}, total: count})
                })
                .catch(Errors.stdCatchFunction(res));
        }
    },
    entitySchemes = {
        //ORDER IS IMPORTANT. IT IS ORDERED WRT PATH Expression
        'create': {path: '/', method: 'post', action: restActions.post},
        'update_bulk': {path: '/', method: 'put', action: restActions.put},
        'delete_bulk': {path: '/', method: 'delete', action: restActions.delete},
        'count': {path: '/count', method: 'put', action: restActions.count},
        'list': {path: '/list', method: 'get', action: restActions.get},
        'query': {path: '/list', method: 'put', action: restActions.put},
        'search': {path: '/search', method: 'put', action: restActions.put},
        'create_bulk': {path: '/list', method: 'post', action: restActions.post},
        'read': {path: '/:entity_id', method: 'get', action: restActions.get},
        'update': {path: '/:entity_id', method: 'put', action: restActions.put},
        'delete': {path: '/:entity_id', method: 'delete', action: restActions.delete}

    };

function Entity(fileName, config_path) {
    var entityConfig = require(config_path),
        storage = entityConfig.storage || 'mongodb',
        depth = entityConfig.depth || 2,
        Collection = require('basyt-' + storage + '-collection'),
        entityCollection = new Collection(entityConfig.collection, fileName),
        router = express.Router(), routing = {},
        queryOptionsInterceptor = function (req, res, next) {
            if (_.isUndefined(req.params.entity_id)) {
                req.isQuery = true;
                req.entity_query = {};
            }
            req.entity_query_options = {
                skip: req.query.skip ? parseInt(req.query.skip) : req.query.skip,
                limit: req.query.limit ? parseInt(req.query.limit) : req.query.limit,
                depth: req.query.deep ? depth : 0
            };
            req.collection = entityCollection;
            req.entity_config = entityConfig;

            if(req.query.sort) {
                req.entity_query_options.sort = {};
                _.forEach(req.collection.visible_fields, function (field) {
                    if (!_.isUndefined(req.query["sort_"+field])) {
                        req.entity_query_options.sort[field] = (req.query["sort_"+field] === -1) ? -1 : 1;
                    }
                });
            }

            next();
        };

    process.basyt.collections[entityConfig.collection.name] = entityCollection;

    entityConfig.auth_levels = _.extend({}, {
        'read': 'USER',
        'list': 'USER',
        'count': 'USER',
        'search': 'USER',
        'update': 'USER',
        'update_bulk': 'USER',
        'query': 'USER',
        'create': 'USER',
        'create_bulk': 'USER',
        'delete': 'USER',
        'delete_bulk': 'USER'
    }, entityConfig.auth_levels);

    entityConfig.interceptors = entityConfig.interceptors || {};
    if (_.isUndefined(entityConfig.disable_update_bulk)) entityConfig.disable_update_bulk = true;
    if (_.isUndefined(entityConfig.disable_delete_bulk)) entityConfig.disable_delete_bulk = true;
    if (_.isUndefined(entityConfig.disable_create_bulk)) entityConfig.disable_create_bulk = true;

    router.param('entity_id', function (req, res, next, entity_id) {
        req.entity_query = {};
        req.entity_query[entityCollection.idField] = entity_id;
        req.isQuery = false;
        next();
    });

    var registerAction = function (action, action_name, native) {
        //check auth levels
        if (native) {
            if (!_.isUndefined(entityConfig.auth_levels[action_name])) {
                router[action.method](action.path, Auth.getAuthInterceptor(entityConfig.auth_levels[action_name]));
            }
        }
        else {
            if (!_.isUndefined(action.auth_level)) {
                router[action.method](action.path, Auth.getAuthInterceptor(action.auth_level));
            }
        }

        //prepare query params
        router[action.method](action.path, function (req, res, next) {
            req.action_name = action_name;
            next();
        });
        router[action.method](action.path, queryOptionsInterceptor);

        if (_.isFunction(entityConfig.interceptors.all)) {
            router[action.method](action.path, entityConfig.interceptors.all);
        }
        else if (_.isArray(entityConfig.interceptors.all)) {
            _.forEach(entityConfig.interceptors.all, function (interceptor) {
                if (_.isFunction(interceptor)) {
                    router[action.method](action.path, interceptor);
                }
            });
        }

        //install custom interceptors
        var interceptors = native ? entityConfig.interceptors[action_name] : action.interceptors;

        if(!_.isArray(interceptors)) {
            interceptors = [interceptors];
        }

        _.forEach(interceptors, function (interceptor) {
            if (_.isFunction(interceptor)) {
                router[action.method](action.path, interceptor);
            }
        });

        //register action
        router[action.method](action.path, action.action);

        //set routing
        routing[entityCollection.name + ':' + action_name] = {
            method: action.method.toUpperCase(),
            path: '/' + entityCollection.name + action.path,
            auth_level: action.auth_level
        };
    }

    _.forOwn(entityConfig.customActions, function(action, action_name){
        registerAction(action, action_name);
    });

    _.forOwn(entitySchemes, function (scheme, schemeName) {
        if (entityConfig['disable_' + schemeName] !== true) {
            registerAction(scheme, schemeName, true);
        }
    });

    this.collection = entityCollection;
    this.config = entityConfig;
    this.router = router;
    this.routing = routing;
}
