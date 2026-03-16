/**
 * backend/middleware/index.js
 */

const serveCookie = require('./serveCookie.js')
const { getToken, checkPass} = require('./jwToken.js')

module.exports = {
  serveCookie,
  getToken,
  checkPass
}