var _ = require('lodash');
var bcrypt = require('bcrypt');
var Auth = require('./Auth');
var Config = GLOBAL.APP_CONFIG.basyt.auth,
    Errors = require('./Errors');

var customActions = {
    login: {
        path: '/login',
        method: 'post',
        action: function (req, res) {
            if (_.isUndefined(req.body.email))
                throw new Errors.InputError([['email', 'required']]);
            if (_.isUndefined(req.body.password))
                throw new Errors.InputError([['password', 'required']]);
            var projection = _.clone(req.collection.projection);
            projection.password = 1;
            delete projection.created_at;
            return req.collection.read({email: req.body.email}, {depth: 2, projection: projection}, true)
                .then(function (entity) {
                    if (req.collection.verifyPassword(req.body.password, entity.password)) {
                        entity.token = Auth.issueToken(entity);
                    }
                    else {
                        throw new process.basyt.ErrorDefinitions.BasytError({message: 'Not Found'}, 404);
                    }
                    return res.json({success: true, result: entity});
                })
                .catch(Errors.stdCatchFunction(res));
        }
    },
    authorize: {
        path: '/a',
        method: 'get',
        auth_level: 'USER',
        action: function(req, res) {
            return res.json({success: true});
        }
    }
    /*
     passwordResetRequest: {},
     passwordReset: {},
     passwordChange: {}
     */
};

if (Config.disable_register !== true) {
    customActions.register = {
        path: '/register',
        method: 'post',
        auth_level: 'ANON',
        action: function UserRegister(req, res, next) {
            var user = req.body.entity,
                activation_code,
                user_model;
            return req.collection.count({email: user.email})
                .then(function (count) {
                    if (count > 0) {
                        throw new Errors.InputError([['email', 'email_exists']]);
                    }
                    return true;
                })
                .then(function () {
                    activation_code = req.collection.createRandomCode(6);
                    user_model = _.extend({}, user, {
                        activation_code: activation_code,
                        created_at: new Date()
                    });

                    return req.collection.create(user_model);
                })
                .then(function (result) {
                    delete user_model.password;
                    delete user_model.created_at;
                    this.publisher.publish('messenger:mail', JSON.stringify({
                        article: {
                            type: 'entity',
                            entity: this.entity,
                            entity_id: result[this.idField]
                        },
                        message: 'user.welcome',
                        data: {
                            activation_code: user_model.activation_code
                        }
                    }));
                    delete user_model.activation_code;
                    user_model.token = Auth.issueToken(user_model);
                    return user_model;
                })
                .then(function (result) {
                    return res.json({success: true, result: result});
                })
                .catch(Errors.stdCatchFunction(res));
        }
    };
}

module.exports = {
    collection: {
        name: "user",
        attributes: _.extend({}, {
            name: {
                type: "string",
                required: true
            },
            email: {
                type: "email",
                required: true,
                index: true,
                indexProps: {
                    unique: true
                }
            },
            telephone: {
                type: "numeric",
                minLength: 7,
                maxLength: 11
            },
            password: {
                type: "string",
                minLength: 6,
                required: true,
                readable: false
            },
            roles: {
                type: "array",
                element: {
                    type: "string",
                    in: ["USER", "ADMIN", "LORD"]
                }
            },
            created_at: {
                type: "datetime",
                writeable: false,
                'default': function () {
                    return new Date();
                },
                readable: false
            },
            activation_code: {
                type: "string",
                readable: false
            }
        }, Config.userExtraFields),

        methods: {
            beforeCreate: function user_entity_before_create(entity) {
                entity.password = this.hashPassword(entity.password);
                if (_.isUndefined(entity.roles)) {
                    entity.roles = ['USER'];
                }
                else {
                    if (entity.roles.indexOf('USER') === -1) entity.roles.push('USER');
                }
                return [true, entity];
            },
            afterCreate: function user_entity_after_create(model, entity) {
                var settings = process.basyt.collections['user_settings'];
                return settings.create({user: model.id.toString()}).then(function () {
                    return model;
                });
            },
            beforeUpdate: function user_entity_before_save(query, update, options) {
                if (_.isObject(update) && _.isObject(update.$set)) {
                    if (!_.isUndefined(update.$set.roles))
                        if (update.$set.roles.indexOf('USER') === -1) update.$set.roles.push('USER');
                    if (!_.isUndefined(update.$set.password))
                        update.$set.password = this.hashPassword(update.$set.password);
                }
                return [false, update, query, options];
            },
            hashPassword: function user_entity_hash_password(password) {
                var salt = bcrypt.genSaltSync(10);
                return bcrypt.hashSync(password, salt);
            },
            verifyPassword: function user_entity_verify_password(password, hash) {
                return bcrypt.compareSync(password, hash);
            },
            createRandomCode: function user_entity_create_random_code(length) {
                return bcrypt.genSaltSync(length);
            }
        },
        eventNames: Config.userEventNames
    },

    auth_levels: _.extend({}, {
        'read': 'USER',
        'list': 'ADMIN',
        'update': 'USER',
        'query': 'ADMIN',
        'create': 'ADMIN',
        'delete': 'ADMIN'
    }, Config.userAPIAuthLevels),

    interceptors: _.extend({}, {
        read: function user_entity_read_interceptor(req, res, next) {
            if (!req.isADMIN && !req.isLORD) {
                req.entity_query[req.collection.idField] = req.auth_user.id;
            }
            next();
        },
        update: function user_entity_update_interceptor(req, res, next) {
            if (!req.isADMIN && !req.isLORD) {
                req.entity_query[req.collection.idField] = req.auth_user.id;
            }
            next();
        }
    }, Config.userAPIInterceptors),

    disable_update_bulk: true,
    disable_delete_bulk: true,
    disable_create_bulk: true,
    customActions: _.extend({}, customActions, Config.userCustomActions)
};
