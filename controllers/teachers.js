/**
 * backend/controllers/getTeachers.js
 */


const { User } = require('../database')


function getTeachers(req, res) {
  let message
  let status 


  const teachers = User.getTeachers()
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)


  function treatSuccess(teachers){
    message = {
      status: "success",
      teachers
    }
  }


  function treatError(error) {
    status = 500 // Server-side error
    message = {
      status: "failure",
      query
    }
    console.log("error in getTeachers:", error)
  }


  function proceed() {
    if (status) {
      res.status(status)
    }
    
    res.json(message)
  }
}



function login(req, res) {
  const { body: query } = req
  // { _id || name, key_phrase }

  let message = {}

  if (query.name) {
    User.createTeacher(query)
      .then(treatSuccess)
      .catch(treatError)
      .finally(proceed)

  } else {
    User.checkKeyPhrase(query)
      .then(treatSuccess)
      .catch(treatError)
      .finally(proceed)
  }

  function treatSuccess(authorized) {
    console.log("authorized:", authorized)
    message.authorized = authorized
  }

  function treatError(error) {
    res.status(500)
    message.error = `ERROR: login ${JSON.stringify(query)} failed
${error}`
  }

  function proceed () {
    res.send(message )
  }
}


module.exports = {
  getTeachers,
  login
}