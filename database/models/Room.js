/**
 * database/models/Room.js
*/


const { Schema, model, Types } = require('mongoose')


const required = true


const schema = Schema({
  name:    { type: String, required, trim: true },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required
  }],
  activities: [{
    type: Schema.Types.ObjectId,
    ref: 'Activity'
  }]
},

{ statics: {
    async createIfNotExistsAndPopulate(
      name,
      teacher,
      users,
      activities = []
    ) {
      const userIds = users.map( user => user._id )
      const activityIds = activities.map(({ _id }) => _id)

      const RoomRecord = await this.findOneAndUpdate(
        { name },
        {
          $setOnInsert: { name },
          $addToSet: {
            teacher:    { _id: teacher._id },
            members:    { $each: userIds },
            activities: { $each: activityIds },
          }
        },
        {
          new: true,
          upsert: true
        }
      )

      return RoomRecord
    },

    /**
     *
     * @param {object} see below
     * @returns the _id of the User with the given name (and
     *          key_phrase) in the given Room, or undefined if
     *          no match is found
     */
    async getRegistered({
      roomName,  // must be name of a Room record
      user_name, // should be name of a User record in Room
      key_phrase // should be a string
    }) {
      const RoomRecord = await this.findOne({name: roomName})
        .populate('members')
        // .lean()

      const member = RoomRecord.members.find( user => (
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
      // don't match anyone in this Room.

      return member?._id?.toString()
    },

    async getRoomObject(name) {
      const RoomRecord = await this.findOne({name})
        .populate('teacher')
        .populate('members')
        .populate('activities')
        .lean() // converts Mongoose Proxy(Array) to normal array

      if (!RoomRecord) {
        const error = `ERROR in getRoomQbject: Room not found - ${name}`
        console.warn(error)
        return { error }
      }

      const teacher = RoomRecord.teacher

      return {
        teacher: {
          _id:        teacher._id.toString(),
          name:       teacher.name,
          key_phrase: teacher.key_phrase,
          role:       teacher.role
        },
        members: RoomRecord.members.map( member => ({
          _id:        member._id.toString(),
          name:       member.name,
          key_phrase: member.key_phrase,
          role:       member.role
        })),
        activities: RoomRecord.activities.map( game => ({
          _id:     game._id.toString(),
          name:    game.name,
          path:    game.path,
          script:  game.script,
          words:   game.words,
          chooser: game.chooser
        })),
      }
    },

    async getTeacherRooms(teacher_id) {
      return await this
        .find({teacher: teacher_id}, { name: 1 })
        .lean()
    },

    async addActivities(_id, activity_ids) {
      if (!Array.isArray(activity_ids)) {
        activity_ids = [activity_ids]
      }

      activity_ids = activity_ids.map( _id => {
        if (typeof _id === "string") {
          _id = new Types.ObjectId(_id)
        }

        return _id
      })

      return await this.findByIdAndUpdate(
        { _id },
        { $addToSet: { activities: { $each: activity_ids }}}
      ).lean()
    }
  }
})


const Room = model("Room", schema)


module.exports = Room