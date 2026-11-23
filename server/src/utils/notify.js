const { Notification, User } = require('../models')
const { sendMail, appUrl } = require('./mailer')

const taskLink = (taskId) => appUrl(`/tasks/${taskId}`)

// Creates in-app notifications and (for `email: true` entries) sends an email.
//   entries: [{ user, type, title, body?, task?, actor?, key?, email? }]
// Self-notifications (user === actor) and duplicate recipients are dropped.
// Entries with a `key` are created at most once ever — the email goes out only for the
// one that was actually inserted, so reminders stay single even with several instances.
// Returns the inserted notifications. Errors are logged, never thrown: a failed
// notification must not fail the request that triggered it.
async function notify(entries) {
  try {
    const seen = new Set()
    const list = entries.filter((e) => {
      if (!e.user) return false
      const id = String(e.user)
      if (e.actor && id === String(e.actor)) return false
      const k = `${id}:${e.type}:${e.key || ''}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    if (!list.length) return []

    let inserted
    try {
      inserted = await Notification.insertMany(list.map(({ email, ...doc }) => doc), { ordered: false })
    } catch (err) {
      // Duplicate keys (reminder already sent) are expected — keep the ones that went in
      if (err.code !== 11000 && !err.writeErrors) throw err
      inserted = err.insertedDocs || []
    }

    const emailFor = new Set(list.filter((e) => e.email).map((e) => `${e.user}:${e.type}:${e.key || ''}`))
    const toEmail  = inserted.filter((n) => emailFor.has(`${n.user}:${n.type}:${n.key || ''}`))
    if (toEmail.length) {
      const users = await User.find({ _id: { $in: toEmail.map((n) => n.user) }, isActive: true }).select('email name')
      const byId  = new Map(users.map((u) => [u.id, u]))
      await Promise.all(toEmail.map((n) => {
        const u = byId.get(String(n.user))
        if (!u) return null
        const lines = [`Hi ${u.name},`, '', n.title]
        if (n.body) lines.push('', n.body)
        if (n.task) lines.push('', `Open the task: ${taskLink(n.task)}`)
        lines.push('', '— SEO Task Tracker')
        return sendMail({ to: u.email, subject: n.title, text: lines.join('\n') })
      }))
    }
    return inserted
  } catch (err) {
    console.error('notify failed:', err.message)
    return []
  }
}

module.exports = { notify, taskLink }
