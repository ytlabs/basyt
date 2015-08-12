GLOBAL.APP_CONFIG = {
    base_folder: __dirname + '/',
    basyt: {
        port: 5850,

        enable_ws: true,
        enable_cors: true,
        enable_auth: true,

        cors: {
            origin: 'http://localhost:8580',
            methods: 'GET,PUT,POST,DELETE'
        },

        disable_discovery: false,

        storage: 'mongodb',
        auth: {
            secret_key: 'very.secre!,t0k3n',
            method: 'jwt'
        },
        log_streams: [{
            type: 'rotating-file',
            path: './basyt.log',
            period: '1d',
            count: 3
        }],
        access_log_streams: [{
            type: 'rotating-file',
            path: './basyt_access.log',
            period: '1d',
            count: 3
        }]
    },
    mongodb: "basyt_testdb"
};

module.exports = GLOBAL.APP_CONFIG;