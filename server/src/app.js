const express = require('express')
const cors = require('cors')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/websites',  require('./routes/websites'))
app.use('/api/projects',  require('./routes/projects'))
app.use('/api/tasks',     require('./routes/tasks'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reports',   require('./routes/reports'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SEO Task Tracker API is running' })
})

app.use(notFound)
app.use(errorHandler)

module.exports = app
