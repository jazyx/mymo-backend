/**
 * Project/backend/database/models/index.js
 */


const User = require("./User.js")
const Room = require("./Room.js")
const Activity = require("./Activity.js")
const Message = require("./Message.js")


module.exports = {
  User,
  Room,
  Activity,
  Message
}