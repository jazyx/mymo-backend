/**
 * backend/controllers/index.js
 */


const ping = require('./ping')
const getRecords = require('./getRecords')
const addRecord = require('./addRecord')
const { getTeachers, login } = require('./teachers')


module.exports = {
  ping,
  getRecords,
  addRecord,
  getTeachers,
  login
}