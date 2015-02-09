GLOBAL.APP_CONFIG = {
    base_folder: __dirname + '/',
    basyt: {
        port: 5850,

        enable_ws: true,
        enable_cors: true,

        cors: {
            origin: 'http://localhost:8580',
            methods: 'GET,PUT,POST,DELETE'
        },

        disable_discovery: false,

        storage: 'mongodb',
        auth: {
            token: 'very.secre!,t0k3n'
        }
    },
    mongodb: {
        connection: 'mongodb://localhost/basyt_db'
    }
};

module.exports = GLOBAL.APP_CONFIG;