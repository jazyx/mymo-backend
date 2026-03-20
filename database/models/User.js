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

    async createTeacher({ name, key_phrase }) {
      const exists = await this.findOne({ name })

      if (!exists) {
        const role = "teacher"
        // Allow empty key_phrase (for teacher to set later)
        if (typeof key_phrase !== "string") {
          key_phrase = ""
        }

        try {
          const user = await this.create(
            { name, key_phrase, role }
          )

          return { name: user.name, _id: user._id }

        } catch (error) {} // return false below
      }

      return false // new teacher <name> could not be created
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
      if (typeof key_phrase !== "string") {
        return false
      }

      if (typeof _id === "string") {
        _id = new Types.ObjectId(_id)
      }

      let user = await this.findOne({ _id, key_phrase })
      // will be undefined if the key_phrase does not match

      if (!user) {
        // Perhaps key_phrase has not been set yet
        user = await this.findOne({ _id })
        if (!user.key_phrase) {
          // The
          const key_phraseWasSet = await this.setKeyPhrase(
            { _id, key_phrase }
          )
          if (!key_phraseWasSet) {
            return false
          }

        } else {
          return false
        }
      }

      return (user)
        ? { name: user.name, _id: user._id }
        : false
    },

    async getTeachers() {
      const teachers = await this.find({ role: "teacher" })
      return teachers.map( teacher => ({
        _id: teacher._id,
        name: teacher.name
      }))
    }
  }
})


const User = model("User", schema)


module.exports = User