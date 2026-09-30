require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes    = require('./routes/auth')
const userRoutes    = require('./routes/users')
const websiteRoutes = require('./routes/websites')
const projectRoutes = require('./routes/projects')
const taskRoutes      = require('./routes/tasks')
const dashboardRoutes = require('./routes/dashboard')
const reportRoutes    = require('./routes/reports')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth',     authRoutes)
app.use('/api/users',    userRoutes)
app.use('/api/websites', websiteRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks',     taskRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports',   reportRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SEO Task Tracker API is running' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
