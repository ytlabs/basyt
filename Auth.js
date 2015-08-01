var jwt = require('jsonwebtoken');
var _ = require('lodash');
var secret;
var Auth = {
    initialize: function (config) {
        secret = config.secret_key;
    },
    decodeRoles: function (req) {
        if (req.auth_user.roles) {
            var role, i;
            for (i = 0; role = req.auth_user.roles[i++];) {
                req['is' + role] = true;
            }
        }
    },
    issueToken: function (payload) {
        return jwt.sign(payload, secret);
    },
    verifyToken: function (token, callback) {
        return jwt.verify(token, secret, {}, callback);
    },
    getRequestToken: function (req) {
        var token;
        if (req.headers && req.headers.authorization) {
            var parts = req.headers.authorization.split(' ');
            if (parts.length == 2) {
                var scheme = parts[0],
                    credentials = parts[1];

                if (/^Bearer$/i.test(scheme)) {
                    token = credentials;
                }
            } else {
                return false;
            }
        } else if (req.query.token) {
            token = req.query.token;
            delete req.query.token;
        } else {
            return false;
        }
        return token;
    },
    getAuthInterceptor: function (auth_level) {
        if (_.isUndefined(secret)) {
            return function authSkipInterceptor(req, res, next) {
                next();
            };
        }

        if (_.isUndefined(auth_level) || auth_level === 'ANON') {
            return function authOptionalInterceptor(req, res, next) {
                var token = Auth.getRequestToken(req);

                if (token === false) {
                    next();
                }
                else {
                    Auth.verifyToken(token, function (err, payload) {
                        if (err) return res.status(401).json({err: {message: 'Authentication Failed [R]'}});

                        req.auth_user = payload;
                        Auth.decodeRoles(req);

                        next();
                    });
                }
            };
        }

        return function authLevelsInterceptor(req, res, next) {
            var token = Auth.getRequestToken(req);

            if (token === false) {
                return res.status(401).json({err: {message: 'Authentication Failed [B]'}});
            }
            else {
                Auth.verifyToken(token, function (err, payload) {
                    if (err) return res.status(401).json({err: {message: 'Authentication Failed [W]'}});
                    //if authorized user does not have role, do not let
                    //console.log(req.originalUrl + ' ' + auth_level + '\n');
                    if (_.isUndefined(payload.roles)) res.status(401).json({err: {message: 'Authorization Failed [D]'}});
                    var role, i, auth = false;
                    if (_.isString(auth_level)) auth_level = [auth_level];
                    for (i = 0; role = auth_level[i++];) {
                        if (payload.roles.indexOf(role) > -1) {
                            auth = true;
                            break;
                        }
                    }

                    if (auth === true) {
                        req.auth_user = payload;
                        Auth.decodeRoles(req);
                        req.accessRole = role;
                        next();
                    }
                    else {
                        return res.status(401).json({err: {message: 'Authentication Failed [K]'}});
                    }
                });
            }
        }
    }
};
module.exports = Auth;
