/**
 * database/models/Class.js
*/


const { Schema, model } = require('mongoose')


const required = true


const schema = Schema({
  name:    { type: String, required, trim: true },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required
  }],
},

{ statics: {
    async createIfNotExistsAndAddMembers(name, users) {
      const userIds = users.map( user => user._id )

      const classRecord = await this.findOneAndUpdate(
        { name },
        {
          $setOnInsert: { name },
          $addToSet: { members: { $each: userIds }}
        },
        {
          new: true,
          upsert: true
        }
      )

      return classRecord
    }, 

    async getClassMembers(name) {
      const classRecord = await this.findOne({name})
        .populate('members')
        .lean() // converts Mongoose Proxy(Array) to normal array

      if (!classRecord) {
        throw new Error('Class not found');
      }

      return classRecord.members.map( member => ({
        _id:        member._id.toString(),
        name:       member.name,
        key_phrase: member.key_phrase,
        role:       member.role
      }))
    }
  }
})


const Class = model("Class", schema)


module.exports = Class