// Scheduled reminders, run every REMINDER_INTERVAL_MINUTES (default 15) by the long-running
// server (src/index.js).
//   • due_soon  — in-app + email, once per task per due date, when due within 24 h
//   • overdue   — in-app + email, once per task per due date, when the due date has passed
//   • digest    — one daily email per person with open overdue / due-soon work, and one team
//                 summary per manager, sent after DIGEST_HOUR (default 9) in APP_TIMEZONE
// Every reminder has a dedupe key, so re-runs and restarts never repeat one.
const { Task, User, Notification } = require('../models')
const { MANAGEMENT_ROLES, CLOSED_TASK_STATUSES } = require('../config/constants')
const { notify } = require('./notify')
const { sendMail, appUrl } = require('./mailer')
const { dayKey, localHour } = require('./time')

const HOUR = 60 * 60 * 1000
const fmt = (d) => new Date(d).toISOString().slice(0, 10)

async function taskReminders(now) {
  const open = { $nin: CLOSED_TASK_STATUSES }
  const [dueSoon, overdue] = await Promise.all([
    Task.find({ status: open, dueDate: { $gte: now, $lte: new Date(now.getTime() + 24 * HOUR) } }).select('title assignee dueDate').lean(),
    Task.find(Task.overdueFilter(now)).select('title assignee dueDate').lean(),
  ])
  const entries = [
    ...dueSoon.map((t) => ({
      user: t.assignee, type: 'due_soon', task: t._id, email: true,
      key: `due_soon:${t._id}:${fmt(t.dueDate)}`,
      title: `Due soon: ${t.title}`, body: `This task is due on ${fmt(t.dueDate)}.`,
    })),
    ...overdue.map((t) => ({
      user: t.assignee, type: 'overdue', task: t._id, email: true,
      key: `overdue:${t._id}:${fmt(t.dueDate)}`,
      title: `Overdue: ${t.title}`, body: `This task was due on ${fmt(t.dueDate)} and is not finished yet.`,
    })),
  ]
  const inserted = await notify(entries)
  return { dueSoon: dueSoon.length, overdue: overdue.length, created: inserted.length }
}

// Inserts the digest's dedupe record first — only the instance that wins sends the email
async function claimDigest(userId, key, title, body) {
  try {
    await Notification.create({ user: userId, type: 'digest', key, title, body })
    return true
  } catch (err) {
    if (err.code === 11000) return false
    throw err
  }
}

async function dailyDigests(now) {
  const today = dayKey(now)
  const soon  = new Date(now.getTime() + 24 * HOUR)
  const tasks = await Task.find({ status: { $nin: CLOSED_TASK_STATUSES }, dueDate: { $ne: null, $lte: soon } })
    .select('title assignee dueDate').lean()
  const users = await User.find({ isActive: true }).select('name email role').lean()
  const byId  = new Map(users.map((u) => [String(u._id), u]))

  const perUser = new Map()
  for (const t of tasks) {
    const id = String(t.assignee)
    if (!byId.has(id)) continue
    if (!perUser.has(id)) perUser.set(id, { overdue: [], dueSoon: [] })
    perUser.get(id)[t.dueDate < now ? 'overdue' : 'dueSoon'].push(t)
  }
  const line = (t) => `  • ${t.title} (due ${fmt(t.dueDate)})`
  let sent = 0

  // Personal digest
  for (const [id, { overdue, dueSoon }] of perUser) {
    const u = byId.get(id)
    const title = `Your tasks today: ${overdue.length} overdue, ${dueSoon.length} due soon`
    if (!(await claimDigest(u._id, `digest:${id}:${today}`, title))) continue
    const text = [
      `Hi ${u.name},`, '', title, '',
      ...(overdue.length ? ['Overdue:', ...overdue.map(line), ''] : []),
      ...(dueSoon.length ? ['Due in the next 24 hours:', ...dueSoon.map(line), ''] : []),
      `Open your tasks: ${appUrl('/tasks?view=mine')}`, '', '— SEO Task Tracker',
    ].join('\n')
    if (await sendMail({ to: u.email, subject: title, text })) sent++
  }

  // Team summary for managers
  const teamOverdue = [...perUser].filter(([, v]) => v.overdue.length)
    .map(([id, v]) => ({ name: byId.get(id).name, count: v.overdue.length }))
    .sort((a, b) => b.count - a.count)
  const totalOverdue = teamOverdue.reduce((s, r) => s + r.count, 0)
  if (totalOverdue) {
    for (const m of users.filter((u) => MANAGEMENT_ROLES.includes(u.role))) {
      const title = `Team summary: ${totalOverdue} overdue task${totalOverdue === 1 ? '' : 's'}`
      const body  = teamOverdue.map((r) => `${r.name}: ${r.count}`).join(', ')
      if (!(await claimDigest(m._id, `team_digest:${m._id}:${today}`, title, body))) continue
      const text = [
        `Hi ${m.name},`, '', title, '',
        ...teamOverdue.map((r) => `  • ${r.name}: ${r.count} overdue`), '',
        `Open the overdue list: ${appUrl('/tasks?view=overdue')}`, '', '— SEO Task Tracker',
      ].join('\n')
      if (await sendMail({ to: m.email, subject: title, text })) sent++
    }
  }
  return { digestsSent: sent }
}

async function runReminders(now = new Date()) {
  const result = await taskReminders(now)
  const digestHour = Number(process.env.DIGEST_HOUR ?? 9)
  if (localHour(now) >= digestHour) Object.assign(result, await dailyDigests(now))
  return result
}

let timer = null
function startReminders() {
  if (timer || process.env.REMINDERS_ENABLED === 'false') return
  const minutes = Math.max(1, Number(process.env.REMINDER_INTERVAL_MINUTES) || 15)
  const run = () => runReminders().catch((err) => console.error('Reminders failed:', err.message))
  setTimeout(run, 10 * 1000).unref()
  timer = setInterval(run, minutes * 60 * 1000)
  timer.unref()
  console.log(`Reminders every ${minutes} min`)
}

module.exports = { runReminders, startReminders, dailyDigests, taskReminders }
