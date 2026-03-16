/**
 * database/models/User.js
*/

const { Schema, Types, model } = require('mongoose')


const schema = Schema({
  name:       { type: String, required: true, unique:true },
  key_phrase: { type: String },
  role:       { type: String, default: "student" }
},

{ statics: {
    async getOrCreateByName(name) {
      const user = await this.findOneAndUpdate(
        { name },
        { $setOnInsert: { name } },
        { new: true, upsert: true, projection: { _id: 1 } }
      )

      return user._id.toString()
    },

    async setKeyPhrase({ _id, key_phrase }) {
      const user = await this.findOneAndUpdate(
        { _id },
        { $set: { key_phrase } },
        { new: true }
      )

      return user.key_phrase === key_phrase
    },

    async checkKeyPhrase({ _id, key_phrase }) {
      const user = await this.findOne({ _id, key_phrase })
      // will be undefined if the key_phrase does not match

      return !!user
    }
  }
})


const User = model("User", schema)


module.exports = User