// Vercel serverless entry: every request is rewritten here (see vercel.json)
require('dotenv').config()
const app = require('../src/app')
const { connectDB } = require('../src/config/db')

module.exports = async (req, res) => {
  await connectDB(process.env.MONGODB_URI)
  return app(req, res)
}
