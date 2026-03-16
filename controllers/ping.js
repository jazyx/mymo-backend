/**
 * backend/controllers/ping.js
 */


module.exports = function ping(req, res) {
  const { protocol, path, ip } = req
  const { host, referer, origin } = req.headers
  const date = Date().replace(/\s*\(.+\)/, "")
  
  const message = `Connection from
referer ${referer}
origin  ${origin}
ip      ${ip}
for     ${protocol}://${host}${path}
at      ${date}`

  // console.log(message);

  if (res) {
    res.send(`<pre>${message}</pre>`)
  }
}