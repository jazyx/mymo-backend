/**
 * backend/controllers/index.js
 */


const ping = require('./ping')
const getRecords = require('./getRecords')
const addRecord = require('./addRecord')


module.exports = {
  ping,
  getRecords,
  addRecord
}