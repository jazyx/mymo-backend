/**
 * backend/controllers/getTeachers.js
 */


const { Room } = require('../database')


function getTeacherRooms(req, res) {
  const { body: query } = req
 
  let message
  let status 


  const teachers = Room.getTeacherRooms(query)
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)


  function treatSuccess(rooms){
    message = {
      status: "success",
      rooms
    }
  }


  function treatError(error) {
    status = 500 // Server-side error
    message = {
      status: "failure",
      query
    }
    console.log("error in getTeacherRooms:", error)
  }


  function proceed() {
    if (status) {
      res.status(status)
    }
    
    res.json(message)
  }
}


module.exports = {
  getTeacherRooms
}