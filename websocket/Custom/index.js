/**
 * Project/backend/websocket/Custom/index.js
 * 
 * Gets all scripts in this Custom/ directory to register for
 * WebSocket messages that are intended for them.
 */


const { readdirSync } = require('fs')
const { join, basename } = require('path')
const thisScript = basename(__filename)
const scripts = readdirSync(__dirname)
  .filter( script => script !== thisScript)


// Load the other scripts, so they can register message listeners
scripts.forEach( script => {
  require(join(__dirname, script))
})