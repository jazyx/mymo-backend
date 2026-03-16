/**
 * Project/backend/database/models/index.js
 */


const User = require("./User.js")
const Class = require("./Class.js")
const Room = require("./Room.js")
const Message = require("./Message.js")


module.exports = {
  User,
  Class,
  Room,
  Message
}