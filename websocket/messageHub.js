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
const { User } = require('../database/models/')


const allUsers = []
// { <uuid>: { socket, uuid, groups, ... }, ... }


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
            const listenerMap = messageListeners[key]
            const listeners = listenerMap[value]
                            || (listenerMap[value] = new Set())
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
    handled = listeners.some( listener => listener( message ))

    // Check for multiple recipients by unique user name
    if (Array.isArray(recipients)) {
      recipients.forEach( name => {
        listeners = Array.from(
          messageListeners.recipient_id[name] || []
        )
        handled = listeners.some( listener => listener( message ))
      })
    }

    // ... and then treat the message by sender_id
    listeners = Array.from(
      messageListeners.sender_id[sender_id] || []
    )
    handled = listeners.some( listener => listener( message ))
          || handled

    // ... and then treat the message by subject
    listeners = Array.from(messageListeners.subject[subject] || [])
    handled = listeners.some( listener => listener( message ))
          || handled

    if (!handled) {
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
    // Find the socket for the given socket_id or user_name
    const socket = getUserData(
      { user_name: id, socket_id: id },
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
}



function disconnect(socket) {
  // const userData = Object.values(allUsers)
  //   .find( value => value.socket === socket )
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
    // delete allUsers[user_id]
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
 * so that this will be available when the client joins a class,
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
async function logIn({ sender_id, user_name }) {
  // Hope for the best
  const message = {
    subject: "LOGGED_IN", // may be changed if there is an error
    sender_id: "SYSTEM",
    recipient_id: sender_id,
    user_name
  }

  // Get the _id of the (new) user with the given name
  const user_id = await User.getOrCreateByName(user_name)

  if (!user_id) {
    // This should never happen
    console.error("logIn failed:", result)
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

  return true
}


async function logOut() {

}


// USER DATA // USER DATA // USER DATA // USER DATA // USER DATA //

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

  if (!key) {
    return userData
  }

  return userData[key]
}


// Share functions and data with other scripts

module.exports = {
  // used by websocket/index.js
  newUser,
  disconnect,
  treatIncoming,
  // available for use by custom scripts
  allUsers,
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData
}