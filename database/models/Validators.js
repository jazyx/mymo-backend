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


const MIN_SIDE = 100
const validateSquare = async function(square) {
  // Allow square to be undefined
  if (!square) {
    return true
  }

  // Ensure square is an array of length 0...
  if (!Array.isArray(square)) {
    return false
  } else if (!square.length) {
    return true
  }

  // ... or with 3 integers
  if (square.length !== 3) {
    return false
  }
  if (!square.every(Number.isInteger)) {
    return false
  }

  const [ left, top, side ] = square

  // Accepts any square that is at least minSide x minSide and
  // fits within the image
  if (left < 0 || top < 0 || side <= 0) return false;
  if (left + side > this.width) return false;
  if (top + side > this.height) return false;

  return true
}

const LANG_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/
const validateDescription = async function(description) {
  // value is a MongooseMap (extends Map)
  // It has Map methods like .entries(), .get(), .set(), etc.
  
  // Convert entries iterator to an array and validate each entry
  const entries = description.entries()

  return entries.every(([ lang, string ]) => (
       typeof lang === "string"
    && LANG_REGEX.test(lang)
    && typeof string === "string"
  ))
}

const validateTags = async function(tags) {
  // see notes in validateDescription

  const entries = tags.entries()

  return entries.every(([ lang, tagArray ]) => (
       typeof lang === "string"
    && LANG_REGEX.test(lang)
    && Array.isArray(tagArray)
    && tagArray.every( tag => typeof tag === "string" )
  ))
}


module.exports = {
  validateUser,
  validateRecipients,
  validateTags,
  validateSquare,
  validateDescription
}