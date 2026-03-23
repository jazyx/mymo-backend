/**
 * backend/database/models/Word.js
 */


const { Schema, model } = require('mongoose')
const Image = require('./Image')
const {
  LANG_REGEX,
  getObjectId
} = require('./helpers')
const required = true


const schema = Schema({
  word:     { type: String, required },
  language: { type: String, required },
  image:    { type: Schema.Types.ObjectId,
              ref: 'Image',
              required
            }
},

{ statics: {
    async addWord(data) {
      const { word, language } = data

      // Check for validation errors before creating a record
      const image = getObjectId(
        data.image, "Word.addWord"
      )
      if (image.error) {
        return image
      }
      
      const record = await Image.findById(image)
      if (!record) {
        const error = `ERROR in Word.addWord()\nno image found with _id\n${image.toString()}`
        console.warn(error)
        return { error }
      }

      if ( typeof word !== "string"
        || typeof language !== "string"
        || !(LANG_REGEX.test(language))
      ) {
        const error = `ERROR in Word.addWord()\nstrings expected for word and language\n${JSON.stringify(data)}`
        console.warn(error)
        return { error }
      }

      // It should now be safe to create a record
      return (new this(data))
        .save()
    },

    async getWord(_id) {
      _id = getObjectId(
        _id, "Word.getWord"
      )
      if (_id.error) {
        return _id
      }

      return await this.findById(_id)
        .populate('image', 'filepath')
    },

    async getWordsInLanguage(query) {
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
        const error = `ERROR in Words.getWordsInLanguage()\nquery should be an object with the format { language: 'la-NG' }\n${JSON.stringify(query)}`
        console.warn(error)
        return error
      }

      const words = await this.find(query)
        .populate("image", "filepath")
      

      return words
    },

    async getWordsByImageTags(query) {
      // { tags: [ "array", "of", "tags" ], lang: "la-NG" }
      // error-checking is done by Image
      const images = await Image.findByTags(query)
      const image_ids = images.map( image => image._id )
      
      query = { image: { $in: image_ids } }
      return this.find(query).populate("image", "filepath")
    }
  }
})


const Word = model("Word", schema)


module.exports = Word