/**
 * backend/websocket/Custom/Mymo.js
 */


const { User, Class } = require('../../database/models/')


const {
  allUsers,
  treatMessageListener,
  sendMessage,
  updateGroups,
  getUserData
} = require('../messageHub.js')
const classes = new Map()


treatMessageListener(
  "add",
  [
    { 
      subject: "MYMO.JOIN_CLASS",
      callback: joinClass
    },
    { subject: "LOG_IN", // also handled by recipient = "SYSTEM"
      callback: logIn, 
    },
    { 
      subject: "MYMO.LEAVE_CLASS",
      callback: leaveClass
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
  const { members } = classObject

  // Remove key_phrase from message data
  const content = members.map( member => ({
    _id:    member._id,
    name:   member.name,
    role:   member.role,
    online: !!member.ws_id
  }))

  const message = {
    recipient_id: sender_id,
    subject: "MYMO.CLASS_MEMBERS",
    sender_id: "MYMO",
    content
  }
  sendMessage(message)

  return true
}



async function logIn({ sender_id, class_name, user_name, key_phrase }) {
  key_phrase = key_phrase.trim()
  const classObject = classes.get(class_name)
  const { members } = classObject
  const member = members.find( member => (
    member.name === user_name
  ))

  if (!member) {
    // TODO: treat unexpected name
    console.error(`No member with the name ${user_name} in class ${class_name}:\n${members.map(member => member.name)}`)
    return
  }

  let authorized = false
  if (member.key_phrase) {
    // Only log in if the key_phrase matches the User record
    authorized = await User.checkKeyPhrase({
      _id: member._id,
      key_phrase
    })

  } else if (key_phrase) {
    // Set the key_phrase for this user
    authorized = await User.setKeyPhrase({ _id: member._id, key_phrase })
  }

  let recipients
  let content

  if (authorized) {
    // Set ws_id of authorized member to confirm login
    member.ws_id = sender_id
    // Find all logged-in members, to update them...
    const online = members .filter( member => member.ws_id )
    recipients = online.map( member => member.ws_id )
    // ... and to share their online status
    
    content = members.map( member => ({
      _id:    member._id,
      name:   member.name,
      role:   member.role,
      online: !!member.ws_id
    }))

  } else { // tell only the rogue user that they could not log in
    recipients = [ sender_id ] // array with only one recipient
    content = "LOGIN FAILED"
  }

  const message = {
    recipients,
    subject: "MYMO.LOGGED_IN",
    sender_id: "MYMO",
    content
  }

  sendMessage(message)
}



function leaveClass({ sender_id, class_name }) {
  
}



