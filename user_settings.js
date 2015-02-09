var _ = require('lodash'),
    Errors = require('./Errors');

module.exports = {
    collection: {
        name: "user_settings",
        attributes: {
            user: {
                type: "relation",
                entity: "user",
                role: "user",
                required: true,
                index: true,
                primary: true
            }
        }
    },
    disable_read: true,
    disable_list: true,
    disable_query: true,
    disable_create: true,
    disable_delete: true,
    disable_update: true,
    interceptors: {
        all: function (req, res, next) {
            req.entity_query.user = req.auth_user.id;
            next();
        },
        update: function (req, res, next) {
            req.entity_query_options.upsert = true;
            req.body.update.$setOnInsert = req.entity_query;
            next();
        }
    },
    customActions: {
        get: {
            path: '/',
            method: 'get',
            auth_level: 'USER',
            action: function (req, res) {
                return req.collection.read(req.entity_query, {projection: {}})
                    .then(function (result) {
                        return res.json({success: true, result: result});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        },
        set: {
            path: '/set/:field',
            method: 'put',
            auth_level: 'USER',
            action: function (req, res) {
                var update = {$setOnInsert: req.entity_query, $set: {}};
                update.$set[req.params.field] = req.body.value;
                return req.collection.update(req.entity_query, update, {upsert: true, multi: true})
                    .then(function () {
                        return res.json({success: true});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        },
        unset: {
            path: '/unset/:field',
            method: 'delete',
            auth_level: 'USER',
            action: function (req, res) {
                var unset = {};
                unset[req.params.field] = "";
                return req.collection.update(req.entity_query, {$unset: unset}, {multi: true})
                    .then(function () {
                        return res.json({success: true});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        },
        push: {
            path: '/push/:field',
            method: 'put',
            auth_level: 'USER',
            action: function (req, res) {
                var update = {$setOnInsert: req.entity_query, $push: {}};
                update.$push[req.params.field] = req.body.value;
                return req.collection.update(req.entity_query, update, {upsert: true, multi: true})
                    .then(function () {
                        return res.json({success: true});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        },
        pull: {
            path: '/pull/:field',
            method: 'delete',
            auth_level: 'USER',
            action: function (req, res) {
                var pull = {};
                pull[req.params.field] = "";
                return req.collection.update(req.entity_query, {$pull: pull}, {multi: true})
                    .then(function () {
                        return res.json({success: true});
                    })
                    .catch(Errors.stdCatchFunction(res));
            }
        }
    }
};