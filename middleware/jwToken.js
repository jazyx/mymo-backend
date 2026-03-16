/**
 * backend/middleware/jwToken.js
 */



const { join } = require('path')
const INDEX = join(process.cwd(), 'public/index.html')

const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET || "secret needed"
const is_dev = process.env.IS_DEV === "true"


const DEFAULTS = {
  algorithm: 'HS256',
  allowInsecureKeySizes: true
}


const getToken = ( payload, options = {} ) => {
  if (typeof options !== "object") {
    // Ignore options if it's not an object
    options = {}
  }

  // Overwrite DEFAULTS with explicit options with the same key
  options = { ...DEFAULTS, ...options }

  const token = jwt.sign(
    payload,
    JWT_SECRET,
    options
  )

  return token
}


const checkPass = (req, res, next) => {
  const pass = req.session?.pass
  const referer = req.headers.referer

  let status = 0
  let message = ""

  if (!pass) {
    if (is_dev) {
      console.log(`🤚DEV: PASS ${req.path} REQUEST FOR ${referer}`)

    } else {
      // Ignore API request: serve home page + cookie instead
      return res.redirect("/")
    }

    proceed()

  } else {
    jwt.verify(pass, JWT_SECRET, treatPass)
  }

  function treatPass(error, payload) {
    const regex = new RegExp(payload)

    const sendHome = 
       error                // the JWT token was invalid
    || !regex.test(referer) // referer undefined or invalid

    if (sendHome) {
      // Ignore API request: respond with index.html file 
      return res.sendFile(INDEX)
    }

    proceed() // with API request
  }

  function proceed() {
    if (status) {
      return res.status(status).send({ message })
    }

    next()
  }
}


module.exports = {
  getToken,
  checkPass
}