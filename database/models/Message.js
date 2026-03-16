/**
 * database/models/Message.js
 * 
 * Comprehensive schema to ensure that all messages that are saved
 * to the database have a valid sender_id, one or more valid
 * recipients (which may be the _id of a Room or a User)
*/

const { Schema, Types, model } = require('mongoose')
const {
  validateUser, 
  validateRecipients
} = require('./Validators.js')


const userDefinition = {
  type: Types.ObjectId,
  ref: 'User',
  required: true,
  validate: {
    validator: validateUser,
    message: 'User does not exist'
  }
}


const recipientDefinition = {
  type: Map,
  of: Number, // timestamp
  default: null,
  validate: { // keys must be existing User or Room _ids
    validator: validateRecipients,
    message: 'All recipients must be valid User or Room IDs'
  }
}


const required = true


const schema = new Schema({
  sender_id:  userDefinition,
  recipients: recipientDefinition,
  subject:    { type: String, required },
  message_id: { type: String, required },
  content:    { type: String, required },
  time_stamp: { type: Number }
},

{ statics: {
    findCorrespondents: async function(message_id){
      const message = await this.findOne({ message_id }).lean();
      if (!message) return [];

      const correspondents = [...message.recipients.keys()];
      correspondents.unshift(message.sender_id.toString());

      return correspondents;
    },

    markAsRead: async function ({
      message_id,
      recipient_id,
      readAt = Date.now()
    }) {
      const key = recipient_id.toString();

      const result = await this.updateOne(
        {
          message_id, // safety check, preventing overwrite
          [`recipients.${key}`]: { $exists: true, $eq: null }
        },
        {
          $set: {
            [`recipients.${key}`]: readAt
          }
        }
      );

      return result.modifiedCount === 1;
    }
  }
})


const Message = model("Message", schema)
module.exports = Message



/**
USAGE in ChatZero.js
===
await Message.markAsRead({
  message_id,
  recipient_id
});
 */