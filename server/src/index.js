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
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`)
    if (process.env.NGROK_AUTHTOKEN) await startTunnel()
  })
}

// Optional public URL via ngrok — enabled only when NGROK_AUTHTOKEN is set
async function startTunnel() {
  try {
    const ngrok = require('@ngrok/ngrok')
    const listener = await ngrok.forward({
      addr: PORT,
      authtoken_from_env: true,
      domain: process.env.NGROK_DOMAIN || undefined,
    })
    console.log(`ngrok tunnel: ${listener.url()}`)
  } catch (err) {
    console.error('ngrok tunnel failed:', err.message)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
