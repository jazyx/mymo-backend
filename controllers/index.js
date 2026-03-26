/**
 * backend/controllers/index.js
 */


const ping = require('./ping')
const getRecords = require('./getRecords')
const addRecord = require('./addRecord')
const { getTeachers, login } = require('./teachers')
const { getTeacherRooms } = require('./teacherRooms')
const { updateUser } = require('./users')


module.exports = {
  ping,
  getRecords,
  addRecord,
  getTeachers,
  login,
  getTeacherRooms,
  updateUser
}