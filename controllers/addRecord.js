/**
 * backend/controllers/addRecord.js
 */



const { Test } = require('../database')


module.exports = function addRecord(req, res) {
  const { body: query } = req

  
  let message
  let status 


  new Test(query)
      .save()
      .then(treatSuccess)
      .catch(treatError)
      .finally(proceed)


  function treatSuccess(record ){
    message = {
      status: "success",
      record
    }
  }


  function treatError(error) {
    status = 500 // Server-side error
    message = {
      status: "failure",
      query
    }
    console.log("error in addRecord:", error)
  }


  function proceed() {
    if (status) {
      res.status(status)
    }
    
    res.json(message)
  }
}