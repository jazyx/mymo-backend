/**
 * database/seed.js
 */


const { readFile } = require('fs/promises')
const { join } = require('path')

const SEED = join(__dirname, 'seed.json')


async function seed(User, Class) {
  const count = await User.estimatedDocumentCount()

  if (count) {
    return console.log(`There are ${count} users in the database`)
  }

  const text = await readFile(SEED, 'utf-8')
  const tests = JSON.parse(text)

  const promises = []

  tests.forEach( testData => {
    const title = testData
    // {
    //   name
    // }

    promises.push(new Promise(addUser))

    function addUser(resolve, reject) {
      new User(testData)
        .save()
        .then(treatSuccess)
        .catch(treatError)

      function treatSuccess(user) {
        const { name, role } = user
        resolve({ name: `${role ? "✅" : "❌"} ${name} ${role}` })
      }

      function treatError(error) {
        reject({ name, saved: false, error })
    }}
  })

  Promise
    .allSettled(promises)
    .then(proceed)

  function proceed (result) {
    const saved = result
      .filter( user => (
        user.status === "fulfilled"
      ))
      .map( user => user.value.name )

    const failed = result
      .filter( user => (
        user.status === "rejected"
      ))
      .map(user => {
        const title = user.reason.title
        const reason = user.reason.error.message

        return { title, reason }
      })

    const message = {}
    if (saved.length) {
      message.saved = saved
    } else {
      message.saved = 0
    }

    if (failed.length) {
      message.failed = failed
    } else {
      message.failed = 0
      createThursdayClass(User, Class)
    }

    console.log("message:", JSON.stringify(message, null, "  ")); 
  }
}



async function createThursdayClass(User, Class) {
  const users = await User.find()
  const classRecord = await Class.createIfNotExistsAndAddMembers(
    "Thursday",
    users
  )

  const members = await Class.getClassMembers("Thursday")

  console.log("Thursday Class:", JSON.stringify(members, null, 2))
}


module.exports = seed
