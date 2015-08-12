module.exports = {
  "entity:user" : {
    eventName: "entity:update:user",
    action: function(data){

    }
  },
  "entity:user" : {
    eventName: "entity:update:user",
    match: {action: "create"},
    action: function(data){

    }
  },
  "entity:user:*" : {
    source: "redis_pattern",
    eventName: "entity:update:user",
    action: function(data){

    }
  },
  "entity:user:*" : {
    source: "redis_pattern",
    eventName: "entity:update:user",
    match: {action: "create"},
    action: function(data){

    }
  },
  "client_ping": {
    source: "socket",
    action: function(data, socket) {

    }
  }
}
