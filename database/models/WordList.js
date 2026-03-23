/**
 * backend/database/models/WordList.js
 */


const { Schema, model } = require('mongoose')
const User = require('./Image')
const Word = require('./Word')
const {
  LANG_REGEX,
  getObjectId
} = require('./helpers')
const required = true


const schema = Schema({
  name:        { type: String, required },
  language:    { type: String, required },
  wordlist:    [{ type: Schema.Types.ObjectId,
                   ref: 'Word'
               }],
  creator_id:  { type: Schema.Types.ObjectId,
                 ref: 'User',
                 required
               },
  // Optional
  tags:        [{ type: String }],
  level:       { type: Number },
  description: { type: String },
},

{ statics: {
    async addWordList(data) {
      const {
        name,
        language,
        wordlist,
        level,
        // creator_id, // treated separately
        tags,
        description
      } = data

      // Check for validation errors before creating a record
      const creator_id = getObjectId(
        data.creator_id, "WordList.addWordList"
      )
      if (creator_id.error) {
        return creator_id
      } else {
        description.creator_id = creator_id
      }

      const record = await User.findById(creator_id)
      if (!record) {
        const error = `ERROR in WordList.addWordList()\nno user found with _id\n${creator_id.toString()}`
        console.warn(error)
        return { error }
      }

      // Ensure that all items in wordlist can be converted to _id
      let error = `ERROR in WordList.addWordList()\nwordList must be an array of Word _ids\n${JSON.stringify(wordlist, null, 2)}`
      if (Array.isArray(wordlist)) {
        wordlist = wordlist.map( word_id => (
             getObjectId(word_id, "WordList.addWordList")
        ))
        if (!(wordlist.some( word_id => word_id.error))) {
          error = 0
        }
      }

      if (error) {
        console.warn(error)
        return { error }
      }

      // Ensure that all items in tags are words
      error = `ERROR in WordList.addWordList()\nIf present, tags must be an array of strings\n${JSON.stringify(tags, null, 2)}`
      if (Array.isArray(tags)) {
        if (tags.every( tag => typeof tag === "string " )) {
          error = 0
        }
      } else {
        error = 0 // no tags
      }

      if (error) {
        console.warn(error)
        return { error }
      }

      if ( typeof name !== "string"
        || typeof language !== "string"
        || !(LANG_REGEX.test(language))
      ) {
        const error = `ERROR in WordList.addWordList()\nstrings expected for name and language\n${JSON.stringify(data), null, 2}`
        console.warn(error)
        return { error }
      }

      if (typeof description !== "string") {
        // Ignore it
        delete data.description
      }

      if (!Number.isInteger(level)) {
        // Ignore it
        delete data.level
      }

      // It should now be safe to create a record
      return (new this(data))
        .save()
    },

    async getWordList(_id) {
      _id = getObjectId(
        _id, "WordList.getWordList"
      )
      if (_id.error) {
        return _id
      }

      return await this.findById(_id)
        .populate('image', 'filepath')
    },

    async getWordListsInLanguage(query) {
      let isValid = false

      if (typeof query === "object") {
        const entries = Object.entries(query)
        isValid = entries.length === 1
          && entries.every(([ key, value ]) => (
            key === "language"
          && typeof value === "string"
          && LANG_REGEX.test(value)
        ))
      }

      if (!isValid) {
        const error = `ERROR in WordLists.getWordListsInLanguage()\nquery should be an object with the format { language: 'la-NG' }\n${JSON.stringify(query)}`
        console.warn(error)
        return error
      }

      const wordlists = await this.find(query)
        .populate("image", "filepath")


      return wordlists
    },

    async getWordListsByImageTags(query) {
      // { tags: [ "array", "of", "tags" ], lang: "la-NG" }
      // error-checking is done by Image
      const images = await Image.findByTags(query)
      const image_ids = images.map( image => image._id )

      query = { image: { $in: image_ids } }
      return this.find(query).populate("image", "filepath")
    }
  }
})


const WordList = model("WordList", schema)


module.exports = WordList