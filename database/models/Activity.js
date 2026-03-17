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

const RELATIVE_JSX_PATH_REGEX = /^\.\/(?:[\w-]+\/)*[\w-]+\.jsx$/
const ROUTE_REGEX = /^\/(?:[\w:-]+\/)*[\w-]+$/

function isValidJSXPath(path) {
  return RELATIVE_JSX_PATH_REGEX.test(path)
}

function isValidRoute(route) {
  return ROUTE_REGEX.test(route)
}


const ChildSchema = Schema({
  label: { type: String, required: true },
  path:  { type: String, required: true }
}, { _id: false })

const schema = Schema({
  name:     { type: String, required, trim: true },
  route:    { type: String, required },
  path:     { type: String, required },
  children: { type: [ChildSchema], default: [] }
},

{ statics: {
    async addRecord(data) {
      // Validate main path
      if (!isValidJSXPath(data.path)) {
        throw new Error(`Invalid path: "${data.path}". Must be a relative .jsx file path (e.g. ./modules/File.jsx)`)
      }

      // Validate route
      if (!isValidRoute(data.route)) {
        throw new Error(`Invalid route: "${data.route}". Must be a relative route (e.g. /room/:RoomName/activity)`)
      }

      // Validate children paths
      if (Array.isArray(data.children)) {
        for (const child of data.children) {
          if (!isValidJSXPath(child.path)) {
            throw new Error(`Invalid child path: "${child.path}". Must be a relative .jsx file path`)
          }
        }
      }

      // Create and save
      const record = new this(data);
      return await record.save();
    }
  }
})


const Activity = model("Activity", schema)


module.exports = Activity