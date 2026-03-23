// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack}`)
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {}
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message
    })
    
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    })
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  })
}

// app.js
const express = require('express')
const asyncHandler = require('./utils/asyncHandler')
const errorHandler = require('./middleware/errorHandler')

app.post('/api/words', asyncHandler(async (req, res) => {
  const word = new Word(req.body)
  await word.save()
  res.json({ success: true, data: word })
}))

app.use(errorHandler) // Last middleware