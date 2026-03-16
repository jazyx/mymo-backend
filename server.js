/**
 * backend/server.js
 */

require('dotenv').config()

// Connect to the database or process.exit() if it's not possible
require('./database')

const { join } = require('path')
const http = require('http')
const PUBLIC = join(__dirname, 'public')

// Prepare path to index.html, to use instead of 404
const index = join(PUBLIC, 'index.html')

// console.log("PUBLIC:", PUBLIC, "\nindex:", index)

const HTTP = process.env.HTTP === "true"
const PROD_REGEX = /^(prod(uction)?|staging|release|deploy)$/i
const is_dev = !PROD_REGEX.test(process.env.NODE_ENV)
process.env.IS_DEV = is_dev

const express = require('express')
const cookieSession = require('cookie-session')
const { serveCookie } = require('./middleware')
const router = require('./router')
const websocket = require('./websocket')

const PORT = process.env.PORT || 3000
const COOKIE_SECRET = process.env.COOKIE_SECRET || "string needed"

const app = express()

// Create a WebSocket that uses the ws:// protocol and can keep a
// TCP channel open and push messages through it to the client.
// WebSocket requires a server created by http.
const server = http.createServer(app)
websocket(server)

app.set('trust proxy', 1)

if (is_dev) {
  // Accept all requests from localhost, or 192.168.0.X,
  // but only in dev mode
  console.log("🤚 USING CORS FOR DEVELOPMENT")
  const options = {
    origin: /http:\/\/(localhost|192\.168\.0\.\d{1,3}):\d+?/,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
  }
  
  app.use(require('cors')(options))
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const cookieOptions = {
  name: "session",
  keys: [ COOKIE_SECRET ],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  httpOnly: true,
  sameSite: is_dev
    ? 'none'
    : 'Lax', // also sends cookie in top-level navigation
  secure: !HTTP
}
app.use(cookieSession(cookieOptions))

app.use(serveCookie)
app.use(express.static(PUBLIC));

// Allow the browser to refresh any page
const domain = is_dev
  ? `http://192.168.0.13:${PORT}`
  : "https://stv.jazyx.com"

// console.log(" domain:",  domain)

// Include:
// frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com;
// script-src 'self' https://www.youtube.com https://s.ytimg.com;
// style-src 'self' 'unsafe-inline';

const CSP =
  "default-src 'self'; " +
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; " +
  "script-src 'self' https://www.youtube.com https://s.ytimg.com " + domain + "; " +
  "style-src 'self'  'unsafe-inline' " + domain + "; " +
  "img-src 'self' " + domain + " https:; " +
  "connect-src 'self' " + domain + "; " +
  "font-src 'self' " + domain + "; " +
  "form-action 'self'; " +
  "frame-ancestors 'none';"

// console.log("CSP:", CSP)

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", CSP);
  next();
});
app.use('/', router)


// Request did not correspond to any route.
// Respond with the index.html file instead of 404.
app.use((req, res) => {
  res.sendFile(index)
})


server.listen(PORT, logHostsToConsole)

function logHostsToConsole() {
  // Check what IP addresses are used by this computer
  const nets = require("os").networkInterfaces()
  const ips = Object.values(nets)
  .flat()
  .filter(({ family }) => (
    family === "IPv4")
  )
  .map(({ address }) => address)

  // ips will include `127.0.0.1` which is the "loopback" address
  // for your computer. This address is not accessible from other
  // computers on your network. The host name  "localhost" can be
  // used as an alias for `127.0.0.1`, so you can add that, too.
  ips.unshift("localhost")

  // Log in the Terminal which URLs can connect to your server
  const hosts = ips.map( ip => (
    `http://${ip}:${PORT}`)
  )

  console.log(`Express server listening at:
  ${hosts.join("\n  ")}
`);
}
