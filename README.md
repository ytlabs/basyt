# basyt
minimalist package to create JSON API server. Typical scenario to use basyt is when you need a rest-like JSON API that provides create/read/update/delete/query actions for your data entities.

## Installation

```bash
$ npm install basyt
$ npm install basyt-mongodb-collection
```

## Features
* is an extension over awesome nodejs framework expressjs
* generates CRUDL API and routing based on entities and controllers located in corresponding folders at the startup
* provides json web token based authentication 
* provides redis based notification for entity updates
* provides user management and role based access control

Please review test folder, there you will find a sample web application exposing test\_entity and test\_relation entities.

## Quick Start
To utilize basyt as foundation of your API, you need several declarations. Firstly basyt needs global APP_CONFIG object.

```js
GLOBAL.APP_CONFIG = {
    base_folder: __dirname + '/', 
    //base_folder definition is required, you probably will keep this line as it is
    
    package_file: GLOBAL.APP_CONFIG.base_folder + 'package.json', 
    //path for package.json file. basyt uses package.json to get application name and version.
    //when not defined package_file is set to base_folder + 'package.json'
    
    basyt: { //scope for basyt related configuration
        port: 5850, 
        //port number that basyt HTTP server will listen
        entity_path: '/',
        //url base path for entity API endpoints. default is '/'
        //if it is set to 'foo' then base address for entity is http://hostname/foo/entity
        entities_folder: GLOBAL.APP_CONFIG.base_folder + 'entities',
        //path for folder that contains entity definitions.
        //when not defined, entities_folder is set to base_folder + 'entities'
        controllers_folder: GLOBAL.APP_CONFIG.base_folder + 'controllers',
        //path for folder that contains entity-free controller definitions.
        //when not defined, controllers_folder is set to base_folder + 'controllers'
        enable_ws: true,
        //enables socket.io based websocket. default true
        enable_cors: true, 
        //enables CORS setup. default false
        enable_auth: true,
        //enables user management and authentication. default true
        cors: { 
          //CORS headers to be setup. Required only when enable_cors is true
          //following values can be set for CORS setup.
          //Content_Type header field is allowed by default
          //Authorization header is allowed when auth is enabled
            origin: 'http://localhost:8580',
            methods: 'GET,PUT,POST,DELETE',
            headers: ['accept']
        },
        auth: {
          //required when enable_auth is true.
            token: 'your.secret.token',
            //token to be used for jwt
            method: 'jwt'
            //currently only supported method is jwt
        }
        disable_discovery: false, 
        //when discovery is enabled, GET request to server's base address will provide all possible API
    },
    mongodb: { //scope for mongodb collection configuration
        connection: 'mongodb://localhost/basyt_db'
    }
};
```

after declaring global APP_CONFIG, you simply instantiate basyt

```js
var basyt = require('basyt');
var basytApp = basyt();
````

basyt explores entities and controllers in corresponding folders and generates API endpoints. In entities folder, entity declarations are like in the following example

```js
module.exports = {
    collection: { //collection is database aspect of entity
        storage: "mongodb",
        //currently the only storage option is mongodb. it is used to select collection
        name: "test_entity",
        //name of entity, used for url path and as collection name
        strict: true,
        //when collection is NOT strict, it accepts attributes that are not defined in attributes list
        attributes: { //list of the attributes of entity
            //following attributes are given as example
            name: {type: "string", required: true},
            email: "email",
            url: "url",
            telephone: {
                type: "numeric",
                minLength: 7,
                maxLength: 11
            }
        },
        event_names: ['{{obj.email}}:test_entity'],
        //basyt emits redis event for entity updates. 
        //By default, it emits entity:{{entity name}}:{{object id}} event
        //for additional events event_names list is used.
        methods: {
          //list of collection methods
          //here hook functions for entity can be defined. for instance beforeCreate, afterCreate etc.
          //see basyt-base-collection/index.js hook functions for complete hook functions and their
          //signature
        }
    },
    auth_levels: {
      //authentication levels for API actions for entity. Default authentication level is 'USER'
      'read': 'USER',
      'list': 'USER',
      'update': 'USER',
      'update_bulk': 'USER',
      'query': 'USER',
      'create': 'USER',
      'create_bulk': 'USER',
      'delete': 'USER',
      'delete_bulk': 'USER'
    },
    //you can disable/enable any API action for entity.
    disable_read: false,
    disable_list: false,
    disable_update: false,
    disable_delete_bulk: true,
    disable_create_bulk: true,
    disable_update_bulk: true,
    customActions: {
      //here you can define any other actions for the entity
      test: {
        path: '/:entity_id/test',
        //url path that action will bind to
        method: 'put',
        //HTTP method for the action
        auth_level: 'ADMIN',
        //Authentication level for the action
        action: function custom_action(req, res) {
          //action function
          return res.json({success: true});
        }
      }
    }
};
```

In controllers folder, entity-free controllers are declared. Those controller files include definitions similar to customActions field of entity declarations.

```js
module.exports = {
    example_action: {
      path: '/example_action',
      //url path that action will bind to
      method: 'GET',
      //HTTP method for the action
      auth_level: 'USER',
      //Authentication level for the action
      action: function example_action(req, res) {
        //action function
        return res.json({success: true});
      }
    }
  };
```

For a controller file named `test\_controller.js` with content given above, there will be an api for address `http://hostname/test_controller/example_action`.

That's all for a quick start. Wiki pages are coming soon!
  
## Why do we call it basyt
In Turkish *basit* means *simple*. That is the motivation: an extension over expressjs to make things simpler. Since our company's initials are YT, we decided to call the project **basyt**, simple web package from Yonca Teknoloji.

