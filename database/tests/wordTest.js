/**
 * backend/database/tests/stringTest.js
 */

// const { Word } = require('../models')

// const words = ["one", "two", "three", "four"]

// words.forEach( word => {
//   Word.addWord({
//     word: word,
//     language: "en",
//     image: "69c049a650b7a6ed5c5ffaa9"
//   }).then( done => {
//     console.log("Word added", JSON.stringify(done, null, '  '))

//     const _id = done._id?.toString() // .substring(1)
//     console.log("_id:", _id)
//     if (_id) {
//       Word.getWord(_id).then( done => (
//         console.log("Word got", JSON.stringify(done, null, '  '))
//       ))
//     }
//   })
// })

// Word.getWordsInLanguage({ language: "en" }).then( done => {
//   console.log("Words found", JSON.stringify(done, null, '  '))
// })

// Word.addWord({
//   word: "five",
//   language: "en",
//   image: "69c049a650b7a6ed5c5ffaa9"
// }).then( done => {
//   console.log("Word added", JSON.stringify(done, null, '  '))
// })

// Word.getWordsByImageTags({
//   tags: ["blague", "joke"],
//   languages: ["en"]
// }).then(done => {
//   console.log("done:", JSON.stringify(done, null, 2))
// })