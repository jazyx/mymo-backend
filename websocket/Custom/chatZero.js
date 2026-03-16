/**
 * backend/websocket/Custom/chatZero.js
 *
 * A simple script to relay incoming CHAT messages to all currently
 * connected users, and to handle their automatic CONFIRM_RECEIPT
 * replies.
 */

const { User } = require('../../database/models/')


const {
  allUsers,
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData
} = require('../messageHub.js')


treatMessageListener(
  "add",
  [
    { callback: joinChatGroup,
      subject: "CHAT.JOIN"
    },
    { callback: treatIncoming,
      subject: "CHAT.MESSAGE"
    },
    { callback: confirmReceipt,
      subject: "CHAT.CONFIRMED"
    },
    { callback: leaveChatGroup,
      subject: "CHAT.LEAVE"
    }
  ]
)


// GROUP MEMBERSHIP & ONLINE STATUS // GROUP & ONLINE STATUS //

async function joinChatGroup({ sender_id }) {
  const group_name = "CHAT"

  // Tell the allUsers entry for sender_id that it should handle
  // outgoing messages from CHAT
  updateGroups(sender_id, { "add": group_name })

  // Ensure that the User record for this user includes CHAT
  // in its groups field
  const user_name = getUserData(
    { socket_id: sender_id },
    "user_name"
  )
  const joined = await User.joinGroup(user_name, group_name)
  console.log(`User ${user_name} just joined group ${group_name}: ${joined}`)

  // Get the names of all the Users in the CHAT group...
  let members = await User
    .getUsersInGroup(group_name) // wait for it...

  members = members
    // ...except for this user...
    .filter( name => name !== user_name )
    // ... and set the online status of each user
    .map( name => {
      const connections = Object.values(allUsers).filter( data => (
           data.user_name === name
        && data.groups.has(group_name)
      ))

      return { name, online: !!connections.length }
    })

  // Tell the joining user the names of the other members in the
  // group
  console.log("CHAT GROUP members:", JSON.stringify(members))
  sendMessage({
    subject: "CHAT.SET_MEMBERS",
    recipient_id: sender_id,
    sender_id: "CHAT",
    members
  })

  // Tell the other connected group members that user_name is now
  // online in the group
  const message = {
    subject: "CHAT.USER_ONLINE",
    sender_id: "CHAT",
    name: user_name
  }

  Object.values(allUsers).forEach( data => {
    if (data.groups.has(group_name)) {
      if (data.user_name !== user_name) {
        // This socket claims to be connected to the CHAT group
        message.recipient_id = data.socket_id
        sendMessage(message)
      }
    }
  })

  return true
}



function leaveChatGroup({ sender_id }) {
  // Get the name of the user who is leaving
  const userData = allUsers[sender_id]
  const { user_name } = userData

  // Remove the CHAT group from the socket data for sender_id
  updateGroups(sender_id, [{ "delete": "CHAT" }])

  // Tell all the remaining connected members of CHAT group that
  // user_name has gone offline
  const message = {
    subject: "CHAT.USER_OFFLINE",
    sender_id: "CHAT",
    name: user_name
    // recipient_id will be added in the next step
  }

  Object.values(allUsers).forEach( data => {
    if (data.groups.indexOf(group_name) > -1) {
      message.recipient_id = data.socket_id
      sendMessage(message)
    }
  })
}


// MESSAGES // MESSAGES // MESSAGES // MESSAGES // MESSAGES //

/* @param {object} message will be an object with a structure like:
 *                 {
 *                   subject:      "CHAT",
 *                   sender_id:    <uuid>,
 *                   recipient_id: <uuid>,
 *                   recipients:   [<uuid or string>],
 *                   message_id:   <simple uuid>,
 *                   content:      { text: string }
 *                 }
 */
function treatIncoming(message) {
  let { message_id, sender_id, recipients, recipient_id } = message

  if (!recipients) { // recipients are usually user_names
    recipients = recipient_id // probably a socket_id string
  }

  if (typeof recipients === "string") {
    // Wrap the string in an array
    recipients = [recipients]
  }

  if (!Array.isArray(recipients)) {
    return console.warn(
      "Incoming message with no recipients",
      message
    )
  }

  const user_name = getUserData(
    { socket_id: sender_id },
    "user_name"
  )

  // Add server time stamp and sender's user_name to message
  const time_stamp = +new Date()
  message.time_stamp = time_stamp
  message.sender_name = user_name

  const socketMaps = Object.values(allUsers)
  // Find the socket_id of each recipient and forward the message
  recipients.forEach( name => {
    const socketData = socketMaps.find(
      data => data.user_name === name || data.socket_id === name
    )

    if (socketData) {
      message.recipient_id = socketData.socket_id
      // message will include recipients names
      sendMessage(message)
    }
  })

  // Inform sender that the server received the message
  const receipt = {
    subject: "CHAT.ACKNOWLEDGED",
    sender_id: "CHAT",
    recipient_id: sender_id,
    message_id,
    time_stamp,
    recipients // [ <string name>, ... ]
  }

  sendMessage(receipt)

  return true
}


/**
 * @param {object} message  will be an object with the structure
 *                 {
 *                   subject:      "CHAT.CONFIRMED",
 *                   sender_id:    <uuid>,
 *                   recipient_id: [<original sender's uuid>],
 *                   message_id:   <simple uuid>,
 *                 }
 */
function confirmReceipt(message) {
  // Add the user_name of the sender of the confirmation message
  const { sender_id } = message
  const socketsArray = Object.values(allUsers)
  const socketData = socketsArray.find( data => (
    data.socket_id === sender_id
  ))

  if (socketData) {
    message.user_name = socketData.user_name
  }

  // Add the server's time stamp to the message...
  message.time_stamp = +new Date()

  // ... and forward it to the sender of the original message
  sendMessage(message)

  console.log("\nCONFIRM:", message)

  return true
}



