/**
 * Project/backend/websocket/Custom/index.js
 * 
 * Gets all .js scripts in this Custom/ directory to register
 * for WebSocket messages that are intended for them.
 */


const options = { withFileTypes: true }
const extensions = [".js"]

const { readdirSync } = require('fs')
const { join, basename, extname  } = require('path')
const thisScript = basename(__filename)

// Filter out all directories and non .js files
const scripts = readdirSync(__dirname, options)
  .filter( dirent => (
       dirent.isFile()
    && extensions.includes(extname(dirent.name))
  ))
  .map(({ name }) => name)
   // ignore index.js
  .filter( script => script !== thisScript)


// Load the other scripts, so they can register message listeners
scripts.forEach( script => {
  require(join(__dirname, script))
})