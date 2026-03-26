/**
 * backend/router.js
 */


const router = require('express').Router()
const { checkPass } = require('./middleware')
const {
  ping,
  getRecords,
  addRecord,
  getTeachers,
  getTeacherRooms,
  login,
  updateUser
} = require('./controllers')


// Ensure that the call came from a client that has already
// connected and received a token.
router.use(checkPass)


router.get("/ping", ping)
router.get("/get_records", getRecords)
router.post("/add_record", addRecord)
router.get("/getTeachers", getTeachers)
router.post("/getTeacherRooms", getTeacherRooms)
router.post("/login", login)
router.post("/updateUser", updateUser)


module.exports = router