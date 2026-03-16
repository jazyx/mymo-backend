/**
 * Project/backend/database/models/Validators.js
 */

const { Schema, Types, model } = require('mongoose')



const validateUser = async function (_id) {
  const exists = await mongoose.model('User').exists({ _id });
  return !!exists;
}


const validateRecipients = async function(recipients) {
      if (!recipients || recipients.size === 0) return false;

      const ids = [...recipients.keys()].map(id => {
        if (!Types.ObjectId.isValid(id)) return null;
        return new Types.ObjectId(id);
      });

      if (ids.includes(null)) return false;

      const [userCount, roomCount] = await Promise.all([
        model('User').countDocuments({ _id: { $in: ids } }),
        model('Room').countDocuments({ _id: { $in: ids } })
      ]);

      // every key must match either a User or a Room
      return userCount + roomCount === ids.length;
    }


module.exports = {
  validateUser,
  validateRecipients
}