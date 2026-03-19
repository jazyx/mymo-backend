/**
 * database/models/Activity.js
*/

const { Schema, model } = require('mongoose')
const required = true

// "name": "Word Game",
// "route": "/room/:RoomName/word-game",
// "path": "./modules/RoomWrapper.jsx",
// "children": [
//   {
//     "label": "game",
//     "path": "./modules/WordGame.jsx"
//   }
// ]

const RELATIVE_JSX_PATH_REGEX = /^\.\/(?:[\w-]+\/)*[\w-]+\.jsx$/i
const RELATIVE_JS_PATH_REGEX = /^\.\/(?:[\w-]+\/)*[\w-]+\.js$/i
const RELATIVE_JSON_PATH_REGEX = /^\.\/(?:[\w-]+\/)*[\w-]+\.json$/i

function isValidJSXPath(path) {
  return RELATIVE_JSX_PATH_REGEX.test(path)
}

function isValidScript(script) {
  return RELATIVE_JS_PATH_REGEX.test(script)
}

function isValidJSON(json) {
  return RELATIVE_JSON_PATH_REGEX.test(json)
}


const schema = Schema({
  name:    { type: String, required, trim: true },
  path:    { type: String, required },
  script:  { type: String, required },
  words:   { type: String, required },
  chooser: { type: String }
},

{ statics: {
    async addRecord(data) {
      // Validate main path
      if (!isValidJSXPath(data.path)) {
        throw new Error(`Invalid path: "${data.path}". Must be a relative .jsx file path (e.g. ./modules/File.jsx)`)
      }

      // Validate script
      if (!isValidScript(data.script)) {
        throw new Error(`Invalid route: "${data.script}". Must be a relative .jsx file path (e.g. ./modules/File.js)`)
      }

      // Validate JSON
      if (!isValidJSON(data.words)) {
        throw new Error(`Invalid route: "${data.words}". Must be a relative .json file path (e.g. ./modules/File.json)`)
      }

      // Create and save
      const record = new this(data);
      return await record.save();
    }
  }
})


const Activity = model("Activity", schema)


module.exports = Activity