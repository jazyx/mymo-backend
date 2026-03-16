/**
 * backend/router.js
 */


const router = require('express').Router()
const { checkPass } = require('./middleware')
const {
  ping,
  getRecords,
  addRecord
} = require('./controllers')


// Ensure that the call came from a client that has already
// connected and received a token.
router.use(checkPass)


router.get("/ping", ping)
router.get("/get_records", getRecords)
router.post("/add_record", addRecord)


module.exports = router