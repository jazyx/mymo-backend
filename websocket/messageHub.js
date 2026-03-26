/**
 * backend/websocket/messageHub.js
 *
 * This script treats messages sent from and to connected clients.
 * It creates two objects:
 *
 *  + allUsers stores the socket used by each connected client
 *    using a unique id as the key
 *  + messageListeners allows incoming messages to be treated
 *    either by...
 *    - The { subject: <string> } in the incoming message. Such
 *      messages can be forwarded to any or all connected clients
 *    ... or:
 *    - One of the { recipient_id: <string> } in the incoming
 *      message. Such messages are treated only for the individual
 *      client identified by the recipient_id.
 *
 *      NOTE: the recipient_id may be "SYSTEM". Messages to
 *      "SYSTEM" are typically used to confirm existence of a new
 *      user and to log in.
 *
 * Custom scripts can register for messages intended for them, by
 * calling treatMessageListener()
 */


const { v4: uuid } = require('uuid')

// Connection to database for LogIn
const { User, Room } = require('../database/models/')


const allUsers = []
// [{ socket, socket_id: uuid, groups: Set, ... }, ... ]


const messageListeners = {
  subject: {},
  sender_id: {},
  recipient_id: {}
} // { <topic>: { <subject>: [<function>, ...], ... }, ... }



/**
 * @param {object} socket will be a WebSocket instance.
 *
 * Adds an entry to allUsers for the new connection.
 * Informs the client of the uuid that has been created for it.
 * The client can then use this for `sender_id` in all future
 * messages.
*/
const newUser = socket => {
  // Add new client to allUsers
  const socket_id = uuid()

  // console.log(`New client ${socket_id} connected`)
  const groups = new Set()
  allUsers.push({ socket, socket_id, groups })
  // user_id, user_name may be added later

  // Tell the client what its userId is going to be
  const message = {
    sender_id:    "SYSTEM",
    recipient_id: socket_id,
    subject:      "CONNECTION"
  }

  sendMessage(message )
}



/**
 * @param {string} action   must be "add" or "delete"
 * @param {object} listener must be an object with the structure
 *                          {
 *                            callback: <function>,
 *                            subject|recipient_id: <string
 *                          }
 *                          OR an array of such objects
 * @returns 0 (no error) or an error object, or an array of such
 *          error objects
 */
const treatMessageListener = (action, listener) => {
  // Prepare for the worst
  const error = {
    message: `ERROR from treatMessageListener`,
    action,
    listener
  }

  if (action === "add" || action === "delete") {
    // Only allow actions which match Set methods

    if (Array.isArray(listener)) {
      // Treat an array of listeners one by one
      const errors = []
      const error = listener.forEach( listener => {
        treatMessageListener(action, listener)
      })
      errors.push(error)

      if (errors.find( error => isNaN(error))) { // object found
        return errors
      }

      // const replacer = (key, value) => {
      //   if (value instanceof Set) {
      //     value = `Set(${value.size})`
      //   }
      //   return value
      // }
      // console.log("messageListeners", JSON.stringify(messageListeners, replacer, '  '));
      

      return 0 // no error: all listeners were successfully treated
    }

    // Check that listener is valid, with expected fields
    if (typeof listener === "object") {
      const { callback } = listener

      if (callback instanceof Function) {
        // Register the listener with each key that is provided
        let treated = 0
        const keys = Object.keys(messageListeners)
        // [ "subject", "sender_id", "recipient_id" ]
        // Note that recipient_id could be a unique user name

        keys.forEach( key => {
          const value = listener[key]
          if (value) {
            const listenerSet = messageListeners[key]
            const listeners = listenerSet[value]
                            || (listenerSet[value] = new Set())
            listeners[action](callback)

            treated += 1
          }
        })

        if (treated) {
          return 0 // no error

        // Error treatment from here on...

        } else {
          error.reason = "listener object must provide at least one of 'subject', 'sender_id' or 'recipient_id'"
        }
      } else {
        error.reason = "listener.callback must be a function"
      }
    } else {
      error.reason = "listener argument must be an object"
    }
  } else {
    error.reason = "action must be 'add' or 'delete'"
  }

  // // Log errors elegantly
  // const replacer = (key, value) => {
  //   if (typeof value === "function") {
  //     return `function ${value.name}()`
  //   }

  //   return value
  // }

  // console.log(JSON.stringify(error, replacer, '  '))

  return error
}



const treatIncoming = message => {

  try {
    console.log( "\nIncoming message:", message )

    let {
      sender_id,
      recipient_id, // probably a socket_id
      recipients,   // may be user names
      subject
    } = message

    let handled = false
    let listeners

    // The same message is normally handled only once, either for
    // a recipient_id (such as "SYSTEM"), for its sender_id, or
    // for its subject. If you need to handle more than one cases,
    // then you need to call treatMessageListener() once for each
    // case. This would be unusual, but this method can handle it.

    // Treat messages with a recipient_id (like "SYSTEM") first
    listeners = Array.from(
      messageListeners.recipient_id[recipient_id] || []
    )
    listeners.forEach( listener => (
      handled = listener( message, handled ) || handled
    ))

    // Check for multiple recipients by unique user name
    if (Array.isArray(recipients)) {
      recipients.forEach( name => {
        listeners = Array.from(
          messageListeners.recipient_id[name] || []
        )
        listeners.forEach( listener => (
          handled = listener( message, handled ) || handled
        ))
      })
    }

    // ... and then treat the message by sender_id
    listeners = Array.from(
      messageListeners.sender_id[sender_id] || []
    )
    listeners.forEach( listener => (
      handled = listener( message, handled ) || handled
    ))

    // ... and then treat the message by subject
    listeners = Array.from(messageListeners.subject[subject] || [])
    listeners.forEach( listener => (
      handled = listener( message, handled ) || handled
    ))

    if (!handled) { // may be a promise
      console.log("\nUnhandled message:", message);
    }

  } catch(error) {
    return console.error("INCOMING MESSAGE ERROR", error)
  }
}



/**
 * @param {object} message should be an object with either a
 *                 recipient_id or a recipients array. If
 *                 recipient_id is present, recipients array is
 *                 ignored.
 *
 * Sends the message via the socket associated with the given ids,
 * if such a socket can be found. Logs an error if not.
 */
const sendMessage = message => {
  if (typeof message !== "object") { return }

  console.log("\nOutgoing message:", message)

  // Check if message has any recipient_ids which map to a socket
  let { recipient_id, recipients } = message

  if (recipient_id) {
    // Send only to the recipient with the given _id, and ignore
    // any other recipients. The recipients data will also be sent.
    recipients = [recipient_id]
  }

  if (!recipients || !Array.isArray(recipients)) {
    return console.error("Message has no recipients", message)
  }

  // socketsArray = Object.values(allUsers)
  recipients.forEach( id => {
    // Recipients can be identified socket_id, User._id, or
    // user_name
    const socket = getUserData(
      { socket_id: id, user_id: id, user_name: id },
      "socket"
    )
    // socketData = socketsArray.find(
    //   data => data.user_name === id || data.socket_id === id
    // )
    // const socket = socketData?.socket

    if (!socket) {
      return console.error("Recipient not found:", recipient_id)
    }

    message.recipient_id = id // may already be set

    socket.send(JSON.stringify(message))
  })

  return true
}



function disconnect(socket) {
  const userData = getUserData({ socket })

  if (!userData) {
    console.warn(`
      ALERT
      No userEntry found for a disconnecting user.
      This should never happen.
      `
    )

  } else {
    // // Get the uuid of the disconnected user...
    // const { user_id } = userData
    // // ... and log the event to the console
    // // console.log(`User ${user_id} disconnected`)

    // TODO: Log Out, Leave all groups, ...

    // Delete the disconnected socket from allUsers
    const index = allUsers.indexOf(userData)
    allUsers.splice(index, 1)

    // Tell any listeners that the socket has just closed
    treatIncoming({
      subject: "DISCONNECT",
      sender_id: "SYSTEM",
      userData
    })
  }
}



// SYSTEM MESSAGES // SYSTEM MESSAGES // SYSTEM MESSAGES //

const treatSystemMessage = (message) => {
  const { subject, sender_id } = message

  switch (subject) {
    case "CONFIRMATION":
      // console.log(`Confirmation from ${sender_id}: ${content}`)
      return true // message was handled

    case "LOG_IN":
      return logIn(message)
  }
}


// Ensure that messages to `system` are handled
treatMessageListener(
  "add",
  [ {
      recipient_id: "SYSTEM",
      callback: treatSystemMessage
    }
  ]
)


/**
 * Log the user into the _SYSTEM_ (not to a particular group).
 * This gives the client access to the appropriate User record,
 * so that this will be available when the client joins a room,
 * group, or room.
 *
 * @param {string} sender_id
 * @param {string} user_name
 *
 * Gets the _id of an existing user with the given user_name,
 * or creates a new User record with this name.
 * Adds the user_id and user_name to the map associated with
 * the socket id _sender_id_, so that other users can find the
 * name of the user with that socket_id.
 * Sends a message back to the client with the approved user_name,
 * or a failure message.
 *
 * @returns true, to indicate that the incoming message was handled
 */
async function logIn(args) {
  const {
    sender_id,
    // roomName,
    user_name,
    // key_phrase
  } = args
  // Hope for the best
  const message = {
    subject: "LOGGED_IN", // may be changed if there is an error
    sender_id: "SYSTEM",
    recipient_id: sender_id,
    user_name
  }

  // Get the _id of the user with the given name. Initial
  // login can have an empty key_phrase.
  const user_id = await Room.getRegistered(args)

  if (!user_id) { // no user w/ given name and key_phrase in room
    console.error("logIn failed:", args)
    message.subject = "LOGIN_FAILED"

  } else {
    // Add this data to the allUsers entry for sender_id
    const customData = {
      user_name,
      user_id
    }
    setUserData(sender_id, customData)
    // console.log("allUsers[sender_id]:", allUsers[sender_id])
  }

  sendMessage(message)

  // Allow listeners to know about the success of the login
  treatIncoming({
    ...args, // includes original sender_id (socket)
    subject: "LOGIN_RESULT", // overwrite "LOG_IN"
    recipient_id: "",        // overwrite "SYSTEM"
    user_id, // will be undefined if login failed
    error: (user_id ? 0 : -1)
  })

  return true
}


async function logOut() {

}


// USER DATA // USER DATA // USER DATA // USER DATA // USER DATA //

/**
 *
 * @param {*} id
 * @param {*} customData
 */
function setUserData(id, customData) {
  // const userData  = allUsers.find( data => (
  //   data.user_id === user_id
  // ))
  const userData = getUserData({ user_id: id, socket_id: id })

  if (userData) {
    Object.entries(customData)
      .forEach(([ key, value ]) => {
        if (value === null || value === undefined) {
          // Remove from userData any values in customData which
          // are explicitly null or undefined
          delete userData[key]
        }
      })

    // Assign the remoining key/value pairs to userData
    Object.assign(userData, customData)

    const replacer = (key, value) => {
      if (key === "socket") {
        return typeof value
      }

      return value
    }

    // console.log(
    //   "setUserData:",
    //   JSON.stringify(userData, replacer, 2)
    // )
  }
}


function updateGroups(id, changes ) {
  // const groups = allUsers[user_id]?.groups
  const groups = getUserData(
    { socket_id: id, user_id: id },
    "groups"
  )

  if (!groups) { return } //

  Object.entries(changes).forEach(([ action, group_name ]) => {
    groups[action](group_name)
  })
}


function getUserData( query, key ) {
  const userData = allUsers.find( data => {
    let found = false
    for ( const key in query ) {
      if (query[key] === data[key]) {
        found = true
      }
    }

    return found
  })

  if (!userData) {
    // console.log("No user data for", query, key)
    return // undefined
  }

  if (!key) {
    return userData
  }

  return userData[key]
}


function getUserSockets( query, key ) {
  const entries = allUsers.filter( data => {
    let found = false
    for ( const key in query ) {
      if (query[key] === data[key]) {
        found = true
      }
    }

    return found
  })
  // [{ socket,
  //    socket_id: uuid,
  //    groups: Set,
  //    user_id: <User._id>
  //    user_name: <string>
  // }]

  // const sockets = entries.map(({ socket_id }) => socket_id)
  const socketsAndGroups = entries.reduce(
    (output, { socket_id, groups }) => {
      output.sockets.push(socket_id)
      groups.forEach( group => output.groups.add(group))

      return output
    },
    { sockets: [], groups: new Set()}
  )
  socketsAndGroups.groups = Array.from(socketsAndGroups.groups)

  return socketsAndGroups // sockets may be []
}


function closeUserSockets(sockets) {
  sockets.forEach( socketId => {
    const userData = allUsers.find(({ socket_id }) => (
      socketId === socket_id
    ))

    const { socket } = userData
    socket.close()

    // This will trigger a disconnect message which will be
    // handled by disconnect() above. userData will be spliced
    // out of allUsers, and any other scripts listening for
    // "DISCONNECT" will be called. In Mymo, for example, the
    // user will be deleted from all groups.
  })
}


function getGroupSockets(group_name) {
  return allUsers
    .filter(({ groups }) => groups?.has(group_name))
    .map(({ socket_id }) => socket_id)
}


// Share functions and data with other scripts

module.exports = {
  // used by websocket/index.js => socket.js
  newUser,
  disconnect,
  treatIncoming,
  // available for use by custom scripts
  allUsers,
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData,
  getGroupSockets,
  getUserSockets,
  closeUserSockets
}