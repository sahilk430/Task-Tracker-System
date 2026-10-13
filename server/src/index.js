require('dotenv').config()
const app = require('./app')
const { connectDB } = require('./config/db')

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET']
const PORT = process.env.PORT || 5001

async function start() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')} (see .env.example)`)
    process.exit(1)
  }

  await connectDB(process.env.MONGODB_URI)
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
