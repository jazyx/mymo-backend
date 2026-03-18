/**
 * backend/websocket/Custom/Mymo.js
 *
 *
 */


const { Room } = require('../../database/models/')


const {
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData,
  getGroupSockets
} = require('../messageHub.js')


const rooms = new Map()


treatMessageListener(
  "add",
  [
    {
      subject: "MYMO.JOIN_ROOM",
      callback: joinRoom
    },
    { subject: "LOGIN_RESULT", // after treatment by "SYSTEM"
      callback: logIn,
    },
    { subject: "MYMO.SET_COHOST",
      callback: setCohost,
    },
    {
      subject: "MYMO.SET_ROOM_ACTIVITY",
      callback: setActivity
    },
    {
      subject: "MYMO.LEAVE_ROOM",
      callback: leaveRoom
    },
    {
      subject: "DISCONNECT",
      callback: disconnectUser
    }
  ]
)


// ROOM MEMBERSHIP & ONLINE STATUS // ROOM & ONLINE STATUS //

async function getRoomObject(roomName) {
  let roomObject = rooms.get(roomName)

  if (!roomObject) {
    roomObject = await Room.getRoomObject(roomName)
    // { members: [
    //     { _id,
    //       name,
    //       key_phrase,
    //       role
    //     }, ...
    //   ],
    //   activities: [
    //     { _id,
    //       name,
    //       path,
    //       route,
    //       children
    //     }
    //   ],
    // + activity: { name, route, path, children }
    // }

    rooms.set(roomName, roomObject)
  }

  return roomObject
}


/**
 *
 * @param {array} members with format [{
 *                   _id: <string from Object_Id>
 *                   name: <string>,
 *                   role: <teacher | cohost | student>,
 *                   key_phrase: <undefined | string>
 *                 }, ...]
 * @returns similar array, without key_phrase and with
 *          online status, for members who are logged in
 *          (not just connected)
 */
function getMembersWithStatus(members) {
  return members.map(({ _id, name, role }) => {
    const socket_id = getUserData({ user_id: _id }, "socket_id") // may be undefined
    return {
      _id,
      name,
      role,
      // no key_phrase
      online: !!socket_id
    }
  })
}


/**
 *
 * @param {sender_id} will be the uuid created on connection
 * @param {roomName} should be the name of a Room record
 *
 * This script does not yet know the identity of the sender. It
 * should be one of the members of the given Room, but the user
 * will have to confirm this by sending a LOG_IN message with
 * one of the member names and a key_phrase. LOG_IN is also
 * handled at a SYSTEM level in messageHub.js.
 *
 * @returns
 */
async function joinRoom({ sender_id, roomName }) {
  const roomObject = await getRoomObject(roomName)
  // May include activity if it was set earlier

  updateGroups(sender_id, { "add": roomName })

  // Remove key_phrase from message data
  const members = getMembersWithStatus(roomObject.members)
  const { activities, activity } = roomObject

  const message = {
    recipient_id: sender_id,
    subject: "MYMO.ROOM_MEMBERS",
    sender_id: "MYMO",
    members,
    activities,
    activity // may be undefined
  }
  sendMessage(message)

  // returns a promise
}


async function logIn({
  error,      // 0 or -1
  // user_id, // string or undefined if unsuccessful
  sender_id,  // socket uuid
  roomName,
  user_name,
  // key_phrase
}) {

  const message = {
    subject: "MYMO.LOGIN_RESULT",
    sender_id: "MYMO",
    recipients: [ sender_id ],
    error
  }

  if (error) {
    // Tell only the rogue user that they could not log in
    return sendMessage(message)
  }

  // If we get here, `user_name` logged in successfully. Send this
  // user everyone's online status, and their own data...
  const { members } = await getRoomObject(roomName)
  message.members = getMembersWithStatus(members)
  message.user = message.members.find( member => (
    member.name === user_name
  ))

  sendMessage(message) // to logged-in user only

  // ...and tell all other online users about the new login, even
  // if they are not yet logged in
  message.recipients = getGroupSockets(roomName)

  // Don't send the second message to the logged-in user
  const index = message.recipients.findIndex( recipient => (
    recipient === sender_id
  ))
  if (index > -1) {
    message.recipients.splice(index, 1)
  }

  if (message.recipients.length) {
    message.subject = "MYMO.ROOM_MEMBERS"
    delete message.user // don't give out the logged-in user's data
    delete message.recipient_id // set by previous sendMessage()
    sendMessage(message) // to everyone else online
  }

  // returns a promise
}


async function setCohost({ roomName, cohost_id }) {
  const roomObject = await getRoomObject(roomName)
  let { members } = roomObject // alter the original members

  let cohost = members.find(({ role }) => (
    role === "cohost"
  ))

  if (cohost) {
    if (cohost?._id === cohost_id) {
      // No change
      return
    }
    // Remove cohost status from about-to-be-ex-cohost
    cohost.role = "student"
  }

  cohost = members.find(({ _id }) => (
    _id === cohost_id
  ))
  if (cohost && cohost.role !== "teacher") {
    cohost.role = "cohost"
  }

  const recipients = getGroupSockets(roomName)
  members = getMembersWithStatus(members)

  const message = {
    subject: "MYMO.ROOM_MEMBERS",
    recipients,
    members
  }
  sendMessage(message)

  // returns a promise
}


async function setActivity(message) {
  // {
  //   subject: "MYMO.SET_ROOM_ACTIVITY",
  //   recipient_id: "MYMO",
  //   sender_id: <teacher or cohost _id>,
  //   roomName,
  //   activity
  // }
  const { roomName, activity } = message

  // Latecomers have yet to be informed. Store for later.
  const roomObject = await getRoomObject(roomName)
  roomObject.activity = activity

  // Now broadcast incoming message to all users connected to Room
  // (= those who called "MYMO.JOIN_ROOM" earlier)
  delete message.recipient_id
  message.sender_id = "MYMO"
  message.recipients = getGroupSockets(roomName)
  sendMessage(message)

  // returns a promise
}



function leaveRoom({ sender_id, roomName }) {
  updateGroups(sender_id, { "delete": roomName })
}


async function disconnectUser({ userData }) {
  // Data now deleted from allUsers:
  // { socket, socket_id: uuid, groups: Set, user_name, user_id }
  console.log("userData:", userData)

  const groups = Array.from( userData.groups )
  const groupSockets = groups.reduce(( socketMap, group ) => {
    socketMap[group] = getGroupSockets(group) // may be []
    return socketMap
  }, {})

  const entries = Object.entries(groupSockets)
  entries.forEach(async ([ group, sockets ]) => {
    if (!sockets.length) {
      // All members of this group have now left. Destroy the
      // roomObject to free up memory on the server.
      rooms.delete(group)

    } else {
      // Tell the remaining members who is still connected and
      // who is still logged in
      let members = (await getRoomObject(group))?.members
      if (members) {          // this should always be truthy
        if (members.length) { // and so should this
          members = getMembersWithStatus(members)

          const message = {
            subject: "MYMO.ROOM_MEMBERS",
            sender_id: "MYMO",
            recipients: sockets,
            members
          }

          sendMessage(message)
        }
      }
    }
  })

  // returns a promise
}



