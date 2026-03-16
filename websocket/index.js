/**
 * websocket/index.js
 */


/**
 * Create a WebSocket Server and handles basic events...
 *
 *  + connection
 *  + message
 *  + close
 *  + pong
 * 
 * This loads a messageHub script which handles incoming messages
 * and dispatches them to the custom activities that listen for
 * them
 */
module.exports = require('./socket.js')


/** Load all custom activities that listen to the WebSocket */
require('./Custom')
