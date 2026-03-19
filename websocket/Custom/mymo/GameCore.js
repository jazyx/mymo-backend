/**
 * backend/websocket/Custom/mymo/GameCore.js
 * 
 * Reducer-like pure script to manage the backend of the Word- and
 * Picture-Games
 */


const defaultWordList = './WordList.json'


const game = (props) => {
  let { players, words, chooser } = (props || {})
  if (!players) {
    players = ["a", "b"] // for testing only
  }

  if (words && typeof words === "string") {
    // Assume this is a path to a JSON file
    words = require(words)
  }
  if (typeof words !== "object") { // may be array or POJO
    words = require(defaultWordList) // for testing only
  }

  if (!chooser) {
    chooser = "standard"
  }


  const state = {
    word: "",
    choices: [],
    found: false,
    played: {}
  }


  const getChoiceFunctions = {
    standard,
    oddOneOut,
    categorize
  }


  const newRound = () => {
    const {
      word,
      choices,
      theme
    } = getChoiceFunctions[chooser](words)

    state.word = word
    state.choices = choices
    state.theme = theme
    state.found = false
    if (!state.score) {
        state.score = players.reduce(( score, player ) => {
        score[player] = 0
        return score
      }, {})
    }
    state.played = {}

    return {...state}
  }


  const checkAnswer = ({ player, choice }) => {
    if (players.indexOf(player) < 0) {
      return `Unknown player: ${player}`
    }

    if (!state.played[player]) {
      state.played[player] = choice

      if (choice === state.word) {
        if (!state.found) {
          state.score[player] += 2
        } else {
          state.score[player] += 1
        }
        state.found = choice
      }
    }

    return {...state}
  }

  // newRound() // populates state

  return {
    getState: () => ({...state}),
    newRound,
    checkAnswer
  }
}


module.exports = game


// UTILITY FUNCTIONS // UTILITY FUNCTIONS // UTILITY FUNCTIONS //

const shuffle = array => {
  for (let ii = array.length - 1; ii > 0; ii--) {
    const jj = Math.floor(Math.random() * (ii + 1));
    [array[ii], array[jj]] = [array[jj], array[ii]]
  }
  return array // allows chaining
}


// getSomeFrom is good for small arrays, but may not scale well 
// to thousands of words
const getSomeFrom = (
  array,
  howMany,
  toIgnore=0,
  moveToEnd
) => {
  const allowed = array.slice(0, array.length - toIgnore)
  const some = shuffle(allowed).slice(0, howMany)

  if (moveToEnd) {
    some.forEach(( value ) => {
      const index = array.indexOf(value)
      array.splice(index, 1)
      array.push(value)
    })
  }

  return some
}


function standard (words) {
  const word = getSomeFrom(words, 1, 3, "moveToEnd")[0]
  const choices = getSomeFrom(words, 3, 1)

  const random = Math.floor(Math.random() * 4)
  choices.splice(random, 0, word)

  return { word, choices }
}


function oddOneOut(words) { // { category: [ word, ... ], ... }
  words = Object.values(words) // [[ word, ... ], [ text, ... ]]

  const [ same, odd ] = getSomeFrom(words, 2)
  const choices = getSomeFrom(same, 3)
  const word = getSomeFrom(odd, 1)[0]

  const index = Math.floor(Math.random() * choices.length)
  choices.splice(index, 0, word)

  return { word, choices }
}


function categorize (words) {
  const categories = Object.keys(words)
  
  // Choose a category and one word from that category
  const theme = getSomeFrom(categories, 1, 3, "moveToEnd")
  const word = getSomeFrom(words[theme], 1, 3, "moveToEnd")[0]
  
  // Choose three decoy categories...
  const decoyCategories = getSomeFrom(categories, 3, 3)
  // ... and one word from each of the decoy lists
  const choices = decoyCategories.reduce(( decoys, category) => {
    const decoy = getSomeFrom(words[category], 1, 3)[0]
    decoys.push(decoy)

    return decoys
  }, [])

  const index = Math.floor(Math.random() * choices.length)
  choices.splice(index, 0, word)

  return { theme, word, choices }
}