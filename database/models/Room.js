/**
 * database/models/User.js
*/

const { Schema, model } = require('mongoose')

const required = true

const schema = Schema({
  room_name: { type: String, required }
})

const Room = model("Room", schema)

module.exports = Room