/**
 * backend/websocket/Custom/Mymo.js
 */


const { User, Class } = require('../../database/models/')


const {
  allUsers,
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData,
  getGroupSockets
} = require('../messageHub.js')


const classes = new Map()


treatMessageListener(
  "add",
  [
    {
      subject: "MYMO.JOIN_CLASS",
      callback: joinClass
    },
    { subject: "LOGIN_RESULT", // after treatment by "SYSTEM"
      callback: logIn,
    },
    { subject: "MYMO.SET_COHOST",
      callback: setCohost,
    },
    {
      subject: "MYMO.LEAVE_CLASS",
      callback: leaveClass
    },
    {
      subject: "DISCONNECT",
      callback: disconnectUser
    }
  ]
)


// CLASS MEMBERSHIP & ONLINE STATUS // CLASS & ONLINE STATUS //

async function getClassObject(class_name) {
  let classObject = classes.get(class_name)

  if (!classObject) {
    const members = await Class.getClassMembers(class_name)
    // [ { _id,
    //     name,
    //     key_phrase,
    //     role,
    //   + ws_id
    //   }, ...
    // ]

    classObject = {
      members
    }
    classes.set(class_name, classObject)
  }

  return classObject
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
 * @param {class_name} should be the name of a Class record
 *
 * This script does not yet know the identity of the sender. It
 * should be one of the members of the given Class, but the user
 * will have to confirm this by sending a LOG_IN message with
 * one of the member names and a key_phrase. LOG_IN is also
 * handled at a SYSTEM level in messageHub.js.
 *
 * @returns
 */
async function joinClass({ sender_id, class_name }) {
  const classObject = await getClassObject(class_name)

  updateGroups(sender_id, { "add": class_name })

  // Remove key_phrase from message data
  const members = getMembersWithStatus(classObject.members)

  const message = {
    recipient_id: sender_id,
    subject: "MYMO.CLASS_MEMBERS",
    sender_id: "MYMO",
    members
  }
  sendMessage(message)

  // returns a promise
}


async function logIn({
  error,      // 0 or -1
  // user_id, // string or undefined if unsuccessful
  sender_id,  // socket uuid
  class_name,
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
  const { members } = await getClassObject(class_name)
  message.members = getMembersWithStatus(members)
  message.user = message.members.find( member => (
    member.name === user_name
  ))

  sendMessage(message) // to logged-in user only

  // ...and tell all other online users about the new login, even
  // if they are not yet logged in
  message.recipients = getGroupSockets(class_name)

  // Don't send the second message to the logged-in user
  const index = message.recipients.findIndex( recipient => (
    recipient === sender_id
  ))
  if (index > -1) {
    message.recipients.splice(index, 1)
  }

  if (message.recipients.length) {
    message.subject = "MYMO.CLASS_MEMBERS"
    delete message.user // don't give out the logged-in user's data
    delete message.recipient_id // set by previous sendMessage()
    sendMessage(message) // to everyone else online
  }

  // returns a promise
}


async function setCohost({ class_name, cohost_id }) {
  const classObject = await getClassObject(class_name)
  let { members } = classObject // alter the original members

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

  const recipients = getGroupSockets(class_name)
  members = getMembersWithStatus(members)

  const message = {
    subject: "MYMO.CLASS_MEMBERS",
    recipients,
    members
  }
  sendMessage(message)

  // returns a promise
}



function leaveClass({ sender_id, class_name }) {
  updateGroups(sender_id, { "delete": class_name })
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
      // classObject to free up memory on the server.
      classes.delete(group)

    } else {
      // Tell the remaining members who is still connected and
      // who is still logged in
      let members = (await getClassObject(group))?.members
      if (members) {          // this should always be truthy
        if (members.length) { // and so should this
          members = getMembersWithStatus(members)

          const message = {
            subject: "MYMO.CLASS_MEMBERS",
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



