const mongoose = require('mongoose')

// Reused across calls so serverless invocations (Vercel) share one connection
let connection = null

async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set (see .env.example)')
  if (!connection) {
    connection = mongoose.connect(uri).catch((err) => {
      connection = null
      throw err
    })
    await connection
    console.log(`MongoDB connected: ${mongoose.connection.name}`)
  }
  return connection
}

module.exports = { connectDB }
