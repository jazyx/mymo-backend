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

    /**
     * 
     * @param {object} see below 
     * @returns the _id of the User with the given name (and
     *          key_phrase) in the given class, or undefined if
     *          no match is found
     */
    async getRegistered({
      class_name, // must be name of a Class record
      user_name,  // should be name of a User record in Class
      key_phrase  // should be a string
    }) {
      const classRecord = await this.findOne({name: class_name})
        .populate('members')
        // .lean()

      const member = classRecord.members.find( user => (
            user.name === user_name
        && (!user.key_phrase || user.key_phrase === key_phrase)
      ))

      if (member && key_phrase && !member.key_phrase) {
        // This login was successful although key_phrase is not
        // set in the User record. Ensure that future logins will
        // fail if the current key_phrase is not given.
        member.set('key_phrase', key_phrase);
        await member.save();
      }

      // member will be undefined if user_name and key_phrase
      // don't match anyone in this class.

      return member?._id?.toString() 
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