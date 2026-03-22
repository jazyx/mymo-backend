/**
 * Project/backend/database/models/index.js
 */


const User = require("./User.js")
const Room = require("./Room.js")
const Image = require("./Image.js")
const Activity = require("./Activity.js")
const Message = require("./Message.js")


// Image._languagesCache will be empty on startup
Image.regenerateLanguagesCache().then(
  cache => console.log("Image._languagesCache:", cache)
)
// This can take over 100 ms, even when there is only
// one record


module.exports = {
  User,
  Room,
  Image,
  Activity,
  Message
}


// TEST //
// setTimeout(() => 
//   require('./imageTest.js'),
//   1000
// )