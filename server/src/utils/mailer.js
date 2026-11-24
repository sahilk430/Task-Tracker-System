// Outgoing email over SMTP. Optional: without SMTP_HOST nothing is sent and the app
// still works (in-app notifications, admin-generated reset links).
//   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, MAIL_FROM
const nodemailer = require('nodemailer')

let transport = null

const isMailConfigured = () => !!process.env.SMTP_HOST

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  }
  return transport
}

// Public URL of the web app, used in email links. Never derived from request headers.
const appUrl = (path = '') =>
  `${(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/+$/, '')}${path}`

// Plain-text email. Resolves true when sent, false when mail isn't configured. Never throws.
async function sendMail({ to, subject, text }) {
  if (!isMailConfigured() || !to) return false
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to, subject, text,
    })
    return true
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message)
    return false
  }
}

// Admin diagnostics: sends one test email and reports the SMTP error text instead of hiding it.
// Never includes the password; only which settings are present.
async function testMail(to) {
  const settings = {
    SMTP_HOST: process.env.SMTP_HOST || null,
    SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER || null,
    SMTP_PASS: process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.replace(/\s/g, '').length} chars)` : null,
    MAIL_FROM: process.env.MAIL_FROM || null,
  }
  if (!isMailConfigured()) return { ok: false, settings, error: 'SMTP_HOST is not set' }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: 'SEO Task Tracker test email',
      text: 'Email is working. You can ignore this message.',
    })
    return { ok: true, settings }
  } catch (err) {
    transport = null // rebuild next time, in case settings change
    return { ok: false, settings, error: err.message }
  }
}

// Tests swap in nodemailer's JSON transport to inspect what would be sent
const setTransport = (t) => { transport = t }

module.exports = { sendMail, testMail, isMailConfigured, appUrl, setTransport }
