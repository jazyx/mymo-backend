/**
 * backend/database/models/helpers.js
 */

const { Types } = require('mongoose')


const ID_REGEX = /^[a-f0-9]{24}$/i
const LANG_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/


function convertToPOJO (mongooseObject) {
  const pojo = mongooseObject.toObject( { flattenMaps: true })
  pojo._id = pojo._id.toString()
  delete pojo.__v

  return pojo 
}


function getObjectId(_id, callee) {
  // ObjectId, integer, and 24 char hex string are good _ids
  if ( _id instanceof Types.ObjectId
    || Number.isInteger(_id)
    || typeof _id === "string" && ID_REGEX.test(_id)
  ) {
    if (typeof _id === "string") {
      _id = new Types.ObjectId(_id)
    }

  } else {
    error =`ERROR in ${callee}():\n_id must be a 24 char hex string, an integer, or an ObjectId:\n"${_id}"${(typeof _id === "string") ? ` (length: ${_id.length})` : ""}`
    console.warn(error)
    return { error }
  }

  return _id
}


async function getRecord(_id, Collection, callee) {
  _id = getObjectId(_id, callee)
  if (_id.error) {
    return _id
  }

  const record = await Collection.findById(_id)
  if (!record) {
    let type = Collection.name
    type = type[0].toLowerCase() + type.substring(1)

    const error = `ERROR in ${callee}(): no ${type} with _id ${_id.toString()}`
    console.warn(error)
    return { error }
  }

  return record
}


async function pojoOrError(record) {
  try {
    await record.save()
    return this._convertToPOJO(record)
  
  } catch(error) {
    return { error }
  }
}


module.exports = {
  LANG_REGEX,
  convertToPOJO,
  getObjectId,
  getRecord,
  pojoOrError
}