const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

// CLIENT_URL may list several origins, comma-separated (e.g. localhost + Vercel)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/members',   require('./routes/members'))
app.use('/api/websites',  require('./routes/websites'))
app.use('/api/projects',  require('./routes/projects'))
app.use('/api/tasks',     require('./routes/tasks'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reports',   require('./routes/reports'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SEO Task Tracker API is running' })
})

// Single-service hosting (Render): when the React build exists next to the server,
// serve it from the same origin. Unknown non-API GETs fall back to index.html so
// client-side routes (/members/:id, /tasks/:id, …) survive a page refresh.
// On Vercel the build isn't present, so this block is skipped.
const clientDist = path.join(__dirname, '../../client/dist')
const clientIndex = path.join(clientDist, 'index.html')
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1y', immutable: true }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.set('Cache-Control', 'no-cache')
    res.sendFile(clientIndex)
  })
}

app.use(notFound)
app.use(errorHandler)

module.exports = app
