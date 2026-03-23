/**
 * backend/database/models/Image.js
 * 
 * Curates a collection of images tagged in different languages.
 * Image.findByTags() returns an array of images whose tags match
 * those given. If findByTags() is called with no specific language
 * images which contain the given tags in any language will be
 * returned.
 * 
 * Internal
 * ========
 *  _languagesCache: []
 *  _updateLanguageCache()
 *  _convertToPOJO()
 * 
 * External
 * ========
 * 
 *  Instant
 *  -------
 *  getLanguages()
 * 
 *  Promise
 *  -------
 *  regenerateLanguagesCache() // to be called after restart
 *  addImage()      // { creator_id, filepath [, tags] }
 *  addTags()       // { "laNG": [ "tag", ...], ... }
 *  findByTags()    // "tag" | ["tag"] | { tags: ["tag"] }
 *                  // { tags: ["tag"], language: ["la-NG"] }
 *  findCreatedBy() // "creator_id" | { creator_id, since }
 * 
 * Tests
 * -----
   Image.addImage({
    creator_id: "69bd9ae02a4a9869a160c7cd",
    filepath: "images/nodoc.webp",
    tags: { en: "joke" },
    description: { en: "cheating at noughts and crosses" } ,
    square: [10, 10, 360 ]
  }).then(
    addedImage => console.log(
    "Added image:", JSON.stringify(addedImage, null, 2)
    )
  )
 * Image.addTags({
     _id: "69bef674bad8a205e137375e", // use real _id
     tags: { ru: ["шутко"]}}
    ).then(result => console.log(
      "Tags added:", JSON.stringify(result, null, 2))
    )
 * Image.findByTags({
     tags: ["joke", 'blague'],
     languages: ["en", "ru"]
   }).then(found => console.log(
     "Found by tags:", JSON.stringify(found, null, 2))
   )
 * Image.findCreatedBy({
     creator_id: "69bd9ae02a4a9869a160c7cd",
     since: 15,
   }).then(result => console.log(
     "Recently created", JSON.stringify(result,  null, '  ')
   ))
 */


const { Schema, Types, model } = require('mongoose')
const { existsSync } = require('fs')
const { join } = require('path')
const { imageSizeFromFile } = require('image-size/fromFile')
const {
  validateTags,
  validateSquare,
  validateDescription
 } = require('./Validators')
const { LANG_REGEX, getObjectId } = require('./helpers')
const required = true

// const tags = {
//   "en": [ "box", "carton", ... ],
//   ...
// }


const schema = new Schema({
  creator_id:  { type: Types.ObjectId, ref: 'User', required },
  batch:       { type: String, required }, // uuid of upload
  filepath:    { type: String, required },
  width:       { type: Number, required },
  height:      { type: Number, required },
  // Set automatically
  ratio:       { type: Number },
  // Optional
  tags:        { 
    type: Map,
    of: [String],
    validate: {
      validator: validateTags,
      message: props => `Tags must be an object with keys like 'la-NG' and values which are arrays of strings\n${JSON.stringify(props.value, null, 2)}`
    },
    default: {}
  },
  description: {
    type: Map,
    of: String,
    validate: {
      validator: validateDescription,
      message: props => `Description must be an object/map with keys like 'la-NG' and values which are strings\n${JSON.stringify(props.value, null, 2)}`
    },
    default: {}
  },
  square:      {
    type: [Number],
    validate: {
      validator: validateSquare,
      message: props => `Square must fit within image bounds\n${JSON.stringify(props.value)}`
    }
  }
},

{ 
  timestamps: true,
  statics: {
   _languagesCache: [],

  _updateLanguageCache: async function (languages) {
    if (typeof language === "string") {
      languages = [ languages ]
    }
    if (!Array.isArray(languages)) {
      throw new Error("Array of language codes expected")
    }

    languages.forEach( language => {
      if (this._languagesCache.indexOf(language) < 0) {
        this._languagesCache.push(language)
      }
    })
  },

  _convertToPOJO: function(mongooseObject) {
    const pojo = mongooseObject.toObject( { flattenMaps: true })
    pojo._id = pojo._id.toString()
    delete pojo.__v

    return pojo 
  },

  _getImage: async function(_id, callee) {
    _id = getObjectId(_id, callee)
    if (_id.error) {
      return _id
    }

    const image = await Image.findById(_id)
    if (!image) {
      const error = `ERROR in Image.${callee}(): no image with _id ${_id.toString()}`
      console.warn(error)
      return { error }
    }

    return image
  },

  _pojoOrError: async function(image) {
    try {
      await image.save()
      return this._convertToPOJO(image)
    
    } catch(error) {
      return { error }
    }
  },

  /**
   * Called by ./index.js immediately after the database is
   * restarted, when _languagesCache will be empty.
   */
  regenerateLanguagesCache: async function () {
    // Fetch all unique language keys in the collection
    const docs = await this.find({}, { tags: 1, _id: 0 }).lean()

    const languageSet = new Set()
    docs.forEach(doc => {
      if (doc.tags) {
        Object.keys(doc.tags).forEach(lang => languageSet.add(lang))
      }
    })

    // Update static cache
    this._languagesCache = Array.from(languageSet)

    return this._languagesCache // Return the updated cache
  },

  getLanguages: function () {
    return this._languagesCache
  },

  /**
   * Adds an image and any tags that it has been given to the
   * database, after checking that the image file actually exists.
   * 
   * @param {object} see below 
   * @returns 
   */
  addImage: async function({
    creator_id,
    batch,
    filepath,
    tags = {},
    description = {},
    square
  }) {
    if (!filepath || typeof filepath !== 'string') {
      return console.warn(`Filepath must be a valid string:\n${filepath}`)
    } 

    const fullPath = join(
      __dirname, // backend/database/modules
      "..",      // backend/database/
      "..",      // backend/
      "public",  // backend/public/
      filepath   // + images/filename.ext
    )
    
    if (!existsSync(fullPath)) {
      return console.warn(`No image found at path: ${filepath}`)
    }

    // const exists = await this.findOne({ filepath })
    // if (exists) {
    //   return console.warn(`Image.addImage: file at ${filepath} already already in database\n${exists}`)
    // }

    creator_id = getObjectId(creator_id, "addImage")
    if (creator_id.error) {
      return creator_id
    }

    const { width, height } = await imageSizeFromFile(fullPath)

    if ( !width || !height ) {
      const error = `Width and height of ${filepath} unknown`
      console.warn(error)
      return { error }
    }

    const ratio = width / height

    const image = new this({
      creator_id,
      batch,
      filepath,
      width,
      height,
      ratio
    })

    let finalImage
    try {
      await image.save() // first save, so addTags can find image

      // Treat optional tags, description and square separately
      // so that a validation error for any one of these will not
      // cause the image insertion to fail.

      const _id = image._id
      // any of t,d,s may become { error: <> } or image
      const t = await this.addTags({ _id, tags })
      const d = await this.addDescription({ _id, description })
      const s = await this.setSquare({ _id, square })
      
      finalImage = (s.error) // POJO or null
        ? (d.error)
          ? (t.error)
            ? null
            : t
          : d
        : s
    } catch(error) {
      console.warn(error)
      return { error }
    }

    return finalImage || this._convertToPOJO(image)
  },

  /**
   * Adds one or more tags in one or more language to the image
   * with the given _id.
   * 
   * @param {object} see below 
   * @returns a POJO with data about the updated image, or with an
   *          error
   */
  addTags: async function ({
    _id,      // 24-char hex string or ObjectId
    tags = {} // format: { "lang": ["tag1", "tag2", ...], ... }
  }) {
    let error = ""

    if (typeof tags !== "object") {
      error = `ERROR in addTags:  tags must be an object with the format\n{ \"en\": [ \"tag1\", \"tag2\", ...], ...}\n${JSON.stringify(tags)}`
      console.warn(error)
      return { error }
    }

    // Sanitize languages and their tags
    let entries = Object.entries(tags)
    entries = entries.map(([ language, newTags ]) => {
      if (typeof newTags === "string") {
        newTags = [ newTags ]
      }
      if (!Array.isArray(newTags)) {
        newTags = [] // ignore non-string tags
      } else {
        newTags = newTags.filter( tag => typeof tag === "string" )
      }

      if (typeof language === "string") {
        return [ language, newTags ]
      } // else return undefined...
    }).filter( entry => !!entry ) // ... and filter undefined out

    if (!entries.length) {
      error =`ERROR in addTags: no valid tags found after sanitization\n${JSON.stringify(tags)}`
      console.warn(error)
      return { error }
    }
 
    const image = await this._getImage(_id, "addTags")
    if ( image.error ) {
      return image
    }

    // If we get here, all inputs are good. Ensure tags map exists.
    if (!image.tags) {
      image.tags = new Map()
    }

    const newLangs = [] // for _updateLanguageCache()
    entries.forEach(([ lang, newTags ]) => {
      newLangs.push(lang)
      const existingTags = image.tags.get(lang) || []
      const updatedTags = Array.from(
        new Set([...existingTags, ...newTags])
      )

      image.tags.set(lang, updatedTags)
    })

    this._updateLanguageCache(newLangs)

    return await this._pojoOrError(image)
  },

  addDescription: async function({ _id, description }) {
    const image = await this._getImage(_id, "addDescription")
    if ( image.error ) {
      return image
    }

    if (typeof description !== "object") {
      const error = `ERROR in Image.addDescription(): description must be an object with the format\n{ \"la-NG\": "string" }\n${JSON.stringify(description)}`
      console.warn(error)
      return error
    }

    const entries = (description instanceof Map)
      ? description.entries()
      : Object.entries(description)
    
    entries.forEach(([ lang, string ]) => {
      image.description.set(lang, string)
    })

    return await this._pojoOrError(image)
  },

  setSquare: async function ({_id, square}) {
    const image = await this._getImage(_id, "setSquare")
    if ( image.error ) {
      return image
    }

    const oldSquare = image.square
    
    image.square = square
    
    return await this._pojoOrError(image)
  },

  /**
   * 
   * @param {varied} args may be:
   *                 * a single string tag (in any language)
   *                 * an array of string tags (in any language)
   *                 * an object with format: { 
   *                     tags: "string",
   *                     languages: [] // optional
   *                   }
   *                 * an object with format: { 
   *                     tags: [],
   *                     languages: [] // optional
   *                   }
   * @returns an array of POJO image objects whose tags match
   *          those given
   */
  findByTags: async function (args) {
    // "tag" | ["tag"] | { tags: ["tag"] } |
    // { tags: [ "array", "of", "tags" ], lang: "la-NG" }

    // Allow flexibility in the arguments
    if (typeof args === "string") {
      // Allow a single string tag argument (in any language)
      args = { tags: [ args ] }
    }

    if (Array.isArray(args)) {
      // Allow an array of string tags in any language   
      args = { tags: args }
    }

    // Ensure tags and languages are arrays of strings
    let { tags, languages=[] } = args
    if (typeof tags === "string") {
      tags = [ tags ]
    }
    if (typeof languages === "string") {
      languages = [ languages ]
    }
    tags = tags.filter( tag => typeof tag === "string")
    languages = languages.filter( lang => (
         typeof lang === "string"
      && LANG_REGEX.test(lang)
    ))

    if (!Array.isArray(tags) || tags.length === 0) {
      const error = `ERROR in findByTags: tags must be a non-empty array\n${args}`
      console.warn(error)
      return []
    }

    // If languages are not provided, find all unique language keys in the collection
    if ( !languages
      || !Array.isArray(languages)
      || languages.length === 0
    ) {
      languages = this._languagesCache // should be populated
      if (!languages.length) { // fallback
        // _languagesCache will be empty when the database starts
        languages = await this.regenerateLanguagesCache()
      }
    }

    if (languages.length === 0) {
      return [] // No valid languages found
    }

    // Build OR conditions
    const orConditions = languages
      .map(lang => ({
        [`tags.${lang}`]: { $in: tags }
      }))

    const images = await this.find({ $or: orConditions })

    return images.map(this._convertToPOJO)
  },

  /**
   * 
   * @param {object} { creator_id: string or ObjectId
   *                   since: Date object or number of minutes ago
   *                 }
   * @returns an array of POJO image objects created by the given
   *          user, in the given time period (or at any time, if
   *          since is neither a Date nor a positive number).
   */
  findCreatedBy: async function (args) {
    if (typeof args !== "object") {
      args = { creator_id: args } // no `since` Date
    }

    let { creator_id, since } = args

    if (typeof creator_id === "string") {
      if (ID_REGEX.test(creator_id)) {
        creator_id = new Types.ObjectId(creator_id)

      } else {
        error =`ERROR in findRecentlyCreatedByTeacher: creator_id must be a 24 char hex string:\n"${creator_id}" (length: ${creator_id.length})`
        console.warn(error)
        return { error }
      }
    }

    const query = { creator_id }

    if (since instanceof Date) {
      query.createdAt = { $gte: since }
    } else if (!(isNaN(since) && since > 0)) {
      // Consider `since` to be a number of minutes ago
      query.createdAt = { $gte: new Date() - since * 60 * 1000 }
    }

    const images = await this.find(query)

    return images.map(this._convertToPOJO)
  }
}}
)


const Image = model("Image", schema)
module.exports = Image