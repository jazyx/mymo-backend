/**
 * Project/backend/database/models/index.js
 */


const User = require("./User.js")
const Room = require("./Room.js")
const Image = require("./Image.js")
const Word = require("./Word.js")
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
  Word,
  Activity,
  Message
}


// TESTS //
// setTimeout(() => 
//   require('../tests/imageTest.js'),
//   1000
// )
setTimeout(() => 
  require('../tests/wordTest.js'),
  500
)