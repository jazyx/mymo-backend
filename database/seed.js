/**
 * database/seed.js
 */


const { readFile } = require('fs/promises')
const { join } = require('path')

const USERS = join(__dirname, 'users.json')
const GAMES = join(__dirname, 'games.json')


async function seed(User, Room, Activity) {
  const count = await User.estimatedDocumentCount()

  if (count) {
    return console.log(`There are ${count} users in the database`)
  }

  const text = await readFile(USERS, 'utf-8')
  const users = JSON.parse(text)

  const promises = []

  users.forEach( userData => {
    const title = userData
    // {
    //   name
    // }

    promises.push(new Promise(addUser))

    function addUser(resolve, reject) {
      new User(userData)
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
      addActivities(Activity)

      message.failed = 0
      createThursdayRoom(User, Activity, Room)
    }

    console.log("message:", JSON.stringify(message, null, "  ")); 
  }
}


async function addActivities(Activity) {
  const count = await Activity.estimatedDocumentCount()

  if (count) {
    return console.log(`There are ${count} activities in the database`)
  }

  const text = await readFile(GAMES, 'utf-8')
  const games = JSON.parse(text)

  const promises = []

  games.forEach( gameData => {
    promises.push(new Promise(addGame))

    function addGame(resolve, reject) {
      const { name } = gameData

      Activity.addRecord(gameData)
        // .save()
        .then(treatSuccess)
        .catch(treatError)

      function treatSuccess(game) {
        const { name, path } = game
        resolve({ name: `${path ? "✅" : "❌"} ${name} ${path}` })
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
      .filter( game => (
        game.status === "fulfilled"
      ))
      .map( game => game.value.name )

    const failed = result
      .filter( game => (
        game.status === "rejected"
      ))
      .map(game => {
        const title = game.reason.title
        const reason = game.reason.error.message

        return { title, reason }
      })

    const message = {}
    if (saved.length) {
      message.saved = saved
    } else {
      message.saved = 0
    }

    console.log("message:", message)
  }
}


async function createThursdayRoom(User, Activity, Room) {
  const users = await User.find()
  const games = await Activity.find()
  const RoomRecord = await Room.createIfNotExistsAndPopulate(
    "Thursday",
    users,
    games
  )

  const {members, activities} = await Room.getRoomData("Thursday")

  console.log("Thursday Room:", JSON.stringify(members, null, 2))
  console.log(JSON.stringify(activities, null, '  '));
  
}


module.exports = seed
