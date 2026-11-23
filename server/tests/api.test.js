// API test suite against a throwaway in-memory MongoDB — never touches a real database.
//   npm test            (from server/)
const path = require('path')
const { execFileSync } = require('child_process')
const { MongoMemoryServer } = require('mongodb-memory-server')
const nodemailer = require('nodemailer')

const SERVER = path.join(__dirname, '..')

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else      { fail++; console.log(`  FAIL ${name} ${extra}`) }
}
const section = (title) => console.log(`\n${title}`)

;(async () => {
  const mem = await MongoMemoryServer.create()
  const uri = mem.getUri('tt-test')
  Object.assign(process.env, {
    JWT_SECRET: 'test-secret', MONGODB_URI: uri,
    SMTP_HOST: 'test', APP_URL: 'https://tracker.test', RESET_RATE_LIMIT: '8',
  })

  const mongoose = require('mongoose')
  const { connectDB } = require('../src/config/db')
  await connectDB(uri)
  const app = require('../src/app')
  const mailer = require('../src/utils/mailer')
  const { runReminders } = require('../src/utils/reminders')
  const { User, Website, Task, TaskActivity, Project, Notification, Attachment } = require('../src/models')

  // Capture outgoing email instead of sending it
  const outbox = []
  const json = nodemailer.createTransport({ jsonTransport: true })
  mailer.setTransport({ sendMail: async (m) => { outbox.push(m); return json.sendMail(m) } })
  const mailTo = (email) => outbox.filter((m) => m.to === email)

  const server = app.listen(0)
  const base = `http://localhost:${server.address().port}/api`

  const call = async (token, method, url, body) => {
    const isForm = body instanceof FormData
    const r = await fetch(base + url, {
      method,
      headers: { ...(!isForm && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && (isForm ? body : JSON.stringify(body)),
    })
    const text = await r.text()
    let data = null; try { data = JSON.parse(text) } catch { data = text }
    return { status: r.status, data, headers: r.headers }
  }
  const login = async (email, password) => (await call(null, 'POST', '/auth/login', { email, password })).data?.token

  // ── Seed ──
  const roles = { admin: 'super_admin', lead: 'team_lead', mm: 'marketing_manager', exec: 'seo_executive', writer: 'content_writer', idle: 'developer' }
  const users = {}
  for (const [k, role] of Object.entries(roles)) {
    users[k] = await User.create({ name: k, email: `${k}@t.com`, role, passwordHash: await User.hashPassword('pw123456') })
  }
  const id = (k) => String(users[k]._id)
  const site  = await Website.create({ name: 'S', domain: 's.com', creator: users.admin._id, members: [{ user: users.exec._id }] })
  const site2 = await Website.create({ name: 'S2', domain: 's2.com', creator: users.admin._id })
  await Project.create({ name: 'P2', website: site2._id, creator: users.admin._id })

  section('1. Login')
  const tok = {}
  for (const k of Object.keys(roles)) {
    tok[k] = await login(`${k}@t.com`, 'pw123456')
    check(`${k} can log in`, !!tok[k])
  }

  section('2. Task creation / activity / completedAt')
  const day = 864e5
  const now = Date.now()
  const specs = [
    // [assignee, status, dueOffsetDays|null, priority]
    ['exec', 'todo',        -2,  'high'],     // overdue
    ['exec', 'backlog',     null,'low'],
    ['exec', 'in_progress', 3,   'critical'], // upcoming
    ['exec', 'in_review',   -1,  'medium'],   // overdue
    ['exec', 'done',        -5,  'medium'],   // not overdue
    ['exec', 'cancelled',   -5,  'low'],      // not overdue, excluded
    ['writer', 'done',      2,   'high'],
    ['writer', 'todo',      30,  'medium'],
    ['admin', 'in_progress', -3, 'high'],     // overdue
  ]
  const created = []
  for (const [who, status, off, priority] of specs) {
    const r = await call(tok.admin, 'POST', '/tasks', {
      title: `${who}-${status}`, websiteId: site._id, category: 'on_page', assignedTo: users[who]._id,
      status, priority, dueDate: off === null ? undefined : new Date(now + off * day).toISOString(),
    })
    if (r.status !== 201) console.log(r)
    created.push(r.data.task)
  }
  check('admin created 9 tasks', created.length === 9 && created.every(Boolean))
  const createdLogs = await TaskActivity.countDocuments({ action: 'created' })
  check('a "created" activity is logged per task', createdLogs === 9, createdLogs)
  check('task created as done gets completedAt', !!created[4].completedAt)
  check('task created as todo has no completedAt', created[0].completedAt === null)
  check('task JSON has an empty checklist and attachment count', Array.isArray(created[0].checklist) && created[0]._count.attachments === 0)

  const tmp = created[1]
  let r = await call(tok.exec, 'PUT', `/tasks/${tmp.id}`, { status: 'done' })
  check('assignee can move own task to done', r.status === 200 && !!r.data.task.completedAt)
  r = await call(tok.exec, 'PUT', `/tasks/${tmp.id}`, { status: 'backlog', priority: 'critical', assignedTo: users.writer._id, completedAt: '2020-01-01', checklist: [{ text: 'x' }] })
  check('leaving done clears completedAt', r.data.task.completedAt === null)
  check('assignee cannot change priority/assignee (ignored)', r.data.task.priority === 'low' && r.data.task.assignee.id === id('exec'))
  check('checklist cannot be written through PUT', r.data.task.checklist.length === 0)
  const feed = await call(tok.admin, 'GET', '/dashboard/stats')
  check('activity feed resolves assignee name on created events',
    feed.data.recentActivity.some((a) => a.action === 'created' && a.newValueName))

  section('3. Member stats match database')
  const all = await Task.find().lean()
  const overdueOf = (t) => t.dueDate && t.dueDate < new Date() && !['done', 'cancelled'].includes(t.status)
  const expect = (uid) => {
    const mine = all.filter((t) => String(t.assignee) === String(uid))
    const total = mine.filter((t) => t.status !== 'cancelled').length
    const completed = mine.filter((t) => t.status === 'done').length
    return {
      total, completed,
      pending: mine.filter((t) => ['backlog', 'todo'].includes(t.status)).length,
      inProgress: mine.filter((t) => ['in_progress', 'in_review'].includes(t.status)).length,
      overdue: mine.filter(overdueOf).length,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    }
  }
  r = await call(tok.admin, 'GET', '/members')
  check('admin sees all 6 members', r.data.members.length === 6)
  for (const m of r.data.members) {
    const e = expect(m.id)
    check(`stats for ${m.name} match DB`, Object.keys(e).every((k) => m.stats[k] === e[k]), JSON.stringify(m.stats))
  }
  const idle = r.data.members.find((m) => m.name === 'idle')
  check('zero-task member → 0% (no NaN)', idle.stats.total === 0 && idle.stats.completionRate === 0)
  check('exec overdue = 2', r.data.members.find((m) => m.name === 'exec').stats.overdue === 2)

  r = await call(tok.admin, 'GET', `/members/${id('exec')}`)
  check('member dashboard loads', r.status === 200)
  check('member byStatus counts', r.data.byStatus.todo === 1 && r.data.byStatus.cancelled === 1 && r.data.byStatus.backlog === 1)
  check('member byPriority excludes cancelled', Object.values(r.data.byPriority).reduce((a, b) => a + b, 0) === 5)
  check('upcoming = in_progress due +3d', r.data.upcoming.length === 1 && r.data.upcoming[0].status === 'in_progress')
  check('overdue list = 2', r.data.overdue.length === 2)
  check('completed list = 1', r.data.completed.length === 1)

  section('4. Permissions')
  r = await call(tok.exec, 'GET', '/members')
  check('member list for team member = only self', r.data.members.length === 1 && r.data.members[0].id === id('exec'))
  r = await call(tok.exec, 'GET', `/members/${id('writer')}`)
  check('team member cannot open another member dashboard (403)', r.status === 403)
  r = await call(tok.mm, 'GET', `/members/${id('exec')}`)
  check('marketing manager can open any member dashboard', r.status === 200)
  r = await call(tok.exec, 'GET', '/tasks')
  check('team member task list = only own', r.data.tasks.length === 6 && r.data.tasks.every((t) => t.assignee.id === id('exec')))
  const writerTask = created[6]
  for (const [m, u, b] of [
    ['GET', ''], ['PUT', '', { status: 'todo' }], ['GET', '/comments'], ['POST', '/comments', { body: 'x' }], ['GET', '/activity'],
    ['GET', '/participants'], ['POST', '/checklist', { text: 'x' }], ['GET', '/attachments'],
  ]) {
    r = await call(tok.exec, m, `/tasks/${writerTask.id}${u}`, b)
    check(`team member ${m} /tasks/:other${u} → 403`, r.status === 403, r.status)
  }
  r = await call(tok.exec, 'POST', '/tasks', { title: 'x', websiteId: site._id, category: 'on_page', assignedTo: users.exec._id })
  check('team member create → 403', r.status === 403)
  r = await call(tok.mm, 'DELETE', `/tasks/${writerTask.id}`)
  check('marketing manager delete → 403 (admin only)', r.status === 403)
  r = await call(tok.exec, 'GET', `/projects?websiteId=${site2._id}`)
  check('non-member cannot read projects of another website', r.status === 403)

  section('5. Filters')
  const count = async (q, t = tok.admin) => (await call(t, 'GET', `/tasks?${q}`)).data.tasks.length
  check('statusGroup=pending', await count('statusGroup=pending') === all.filter((t) => ['backlog', 'todo'].includes(t.status)).length)
  check('statusGroup=completed', await count('statusGroup=completed') === 2)
  check('overdue=true', await count('overdue=true') === all.filter(overdueOf).length)
  check('mine=true for admin', await count('mine=true') === 1)
  check('operator injection ignored', await count('status[$ne]=zzz') === 9)

  section('6. Dashboard')
  r = await call(tok.admin, 'GET', '/dashboard/stats')
  const s = r.data.summary
  check('summary counts match DB', s.total === 8 && s.completed === 2 && s.pending === 3 && s.inProgress === 3 && s.overdue === all.filter(overdueOf).length, JSON.stringify(s))
  r = await call(tok.exec, 'GET', '/dashboard/stats')
  check('team member dashboard scoped to own tasks', r.data.summary.total === 5 && r.data.teamWorkload === null)

  section('7. Security hardening')
  r = await call(null, 'GET', '/health')
  check('security headers set (helmet)', r.headers.get('x-content-type-options') === 'nosniff' && !!r.headers.get('content-security-policy'))
  check('X-Powered-By hidden', !r.headers.get('x-powered-by'))
  r = await call(tok.admin, 'POST', '/users', { name: 'weak', email: 'weak@t.com', password: 'abc12', role: 'developer' })
  check('short password rejected', r.status === 400 && /8 characters/.test(r.data.message))
  r = await call(tok.admin, 'POST', '/users', { name: 'weak', email: 'weak@t.com', password: 'abcdefghij', role: 'developer' })
  check('password without a number rejected', r.status === 400)
  r = await call(tok.admin, 'POST', '/users', { name: 'temp', email: 'temp@t.com', password: 'Temp12345', role: 'developer' })
  check('strong password accepted', r.status === 201)
  const tempId = r.data.user.id
  const tempTok = await login('temp@t.com', 'Temp12345')
  check('existing tokens work', (await call(tempTok, 'GET', '/auth/me')).status === 200)
  await call(tok.admin, 'PATCH', `/users/${tempId}/toggle-active`)
  r = await call(tempTok, 'GET', '/auth/me')
  check('deactivated user is signed out immediately', r.status === 401, r.status)
  await call(tok.admin, 'PATCH', `/users/${tempId}/toggle-active`)
  await call(tok.admin, 'PUT', `/users/${tempId}`, { role: 'team_lead' })
  r = await call(tempTok, 'GET', '/users')
  check('role change applies without re-login', r.status === 200, r.status)
  await call(tok.admin, 'PUT', `/users/${tempId}`, { password: 'Changed123' })
  r = await call(tempTok, 'GET', '/auth/me')
  check('admin password change signs the user out', r.status === 401 && /password was changed/.test(r.data.message))
  r = await call(tok.admin, 'GET', '/auth/me')
  check('admin who changed it stays signed in', r.status === 200)
  r = await call(null, 'GET', '/auth/me')
  check('no token → 401', r.status === 401)
  r = await fetch(`${base}/auth/me`, { headers: { Authorization: 'Bearer not-a-jwt' } })
  check('garbage token → 401', r.status === 401)
  let limited = false
  for (let i = 0; i < 12 && !limited; i++) {
    limited = (await call(null, 'POST', '/auth/login', { email: 'idle@t.com', password: 'wrong-pass' })).status === 429
  }
  check('repeated failed logins are rate limited (429)', limited)
  check('other accounts can still log in', !!(await login('lead@t.com', 'pw123456')))
  r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' })
  check('malformed JSON → 400', r.status === 400)

  section('8. Password reset')
  outbox.length = 0
  r = await call(null, 'POST', '/auth/forgot-password', { email: 'nobody@t.com' })
  const reply = r.data.message
  check('unknown email → 200, nothing sent', r.status === 200 && outbox.length === 0)
  r = await call(null, 'POST', '/auth/forgot-password', { email: 'exec@t.com' })
  check('known email → same reply (no account enumeration)', r.status === 200 && r.data.message === reply)
  const resetMail = mailTo('exec@t.com')[0]
  const token = resetMail?.text.match(/reset-password\?token=([a-f0-9]{64})/)?.[1]
  check('reset email sent with a link to APP_URL', !!token && resetMail.text.includes('https://tracker.test/reset-password'))
  const stored = await User.findById(users.exec._id).select('+resetTokenHash').lean()
  check('only a hash of the token is stored', stored.resetTokenHash && stored.resetTokenHash !== token)
  check('reset fields never serialised', !('resetTokenHash' in (await call(tok.admin, 'GET', `/users/${id('exec')}`)).data.user))
  r = await call(null, 'POST', '/auth/reset-password', { token, password: 'short' })
  check('weak new password rejected', r.status === 400)
  r = await call(null, 'POST', '/auth/reset-password', { token, password: 'NewPass123' })
  check('reset succeeds', r.status === 200)
  check('old session invalid after reset', (await call(tok.exec, 'GET', '/auth/me')).status === 401)
  check('old password no longer works', !(await login('exec@t.com', 'pw123456')))
  tok.exec = await login('exec@t.com', 'NewPass123')
  check('new password works', !!tok.exec)
  r = await call(null, 'POST', '/auth/reset-password', { token, password: 'Another123' })
  check('reset link works only once', r.status === 400)
  r = await call(tok.exec, 'POST', `/users/${id('writer')}/reset-link`)
  check('non-admin cannot create reset links', r.status === 403)
  r = await call(tok.admin, 'POST', `/users/${id('writer')}/reset-link`)
  const adminToken = r.data.link?.match(/token=([a-f0-9]{64})/)?.[1]
  check('admin can create a reset link (no email needed)', r.status === 200 && !!adminToken)
  r = await call(null, 'POST', '/auth/reset-password', { token: adminToken, password: 'Writer1234' })
  check('admin-issued link resets the password', r.status === 200)
  tok.writer = await login('writer@t.com', 'Writer1234')
  await User.updateOne({ email: 'exec@t.com' }, { resetTokenExpires: new Date(now - 1000), resetTokenHash: 'x'.repeat(64) })
  r = await call(null, 'POST', '/auth/reset-password', { token: 'x'.repeat(64), password: 'Expired123' })
  check('expired / unknown token rejected', r.status === 400)
  limited = false
  for (let i = 0; i < 10 && !limited; i++) {
    limited = (await call(null, 'POST', '/auth/forgot-password', { email: 'idle@t.com' })).status === 429
  }
  check('password reset requests are rate limited', limited)

  section('9. Notifications')
  const notes = async (k) => (await call(tok[k], 'GET', '/notifications')).data
  let n = await notes('exec')
  check('assignee notified for each task assigned by someone else', n.notifications.filter((x) => x.type === 'assigned').length === 6)
  n = await notes('admin')
  check('no notification for assigning yourself', n.notifications.every((x) => x.type !== 'assigned'))
  check('status change by assignee notifies the creator', n.notifications.some((x) => x.type === 'status' && x.task?.id === tmp.id))
  check('notification carries actor name and task title', n.notifications.some((x) => x.actor?.name === 'exec' && x.task?.title))

  outbox.length = 0
  const execTask = created[0]
  r = await call(tok.exec, 'GET', `/tasks/${execTask.id}/participants`)
  const names = r.data.users.map((u) => u.name).sort().join(',')
  // `temp` was promoted to team lead in section 7
  check('participants = assignee + active managers', names === 'admin,exec,lead,mm,temp', names)
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/comments`, { body: 'Hey @mm and @writer', mentions: [id('mm'), id('writer'), 'bogus', id('exec')] })
  check('comment saved with only allowed mentions', r.status === 201 && r.data.comment.mentions.length === 1 && r.data.comment.mentions[0].name === 'mm', JSON.stringify(r.data.comment?.mentions))
  n = await notes('mm')
  check('mentioned user gets a mention notification', n.notifications.some((x) => x.type === 'mention' && x.task?.id === execTask.id))
  check('mention also emailed', mailTo('mm@t.com').some((m) => m.subject.includes('mentioned you')))
  n = await notes('writer')
  check('user without access is not notified', n.notifications.every((x) => x.task?.id !== execTask.id))
  n = await notes('admin')
  check('task creator gets a comment notification', n.notifications.some((x) => x.type === 'comment' && x.task?.id === execTask.id))
  check('commenter is not notified of own comment', (await notes('exec')).notifications.every((x) => x.type !== 'comment'))
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/comments`, { body: 'x'.repeat(5001) })
  check('overlong comment rejected', r.status === 400)

  n = await notes('mm')
  const one = n.notifications[0]
  r = await call(tok.exec, 'PATCH', `/notifications/${one.id}/read`)
  check("can't mark someone else's notification", r.status === 404)
  r = await call(tok.mm, 'PATCH', `/notifications/${one.id}/read`)
  check('mark one read', r.status === 200 && r.data.unread === n.unread - 1)
  await call(tok.mm, 'POST', '/notifications/read-all')
  check('mark all read', (await notes('mm')).unread === 0)

  section('10. Reminders and digests')
  outbox.length = 0
  const soonTask = (await call(tok.admin, 'POST', '/tasks', {
    title: 'due-soon', websiteId: site._id, category: 'content', assignedTo: users.writer._id, status: 'todo',
    dueDate: new Date(now + 12 * 3600e3).toISOString(),
  })).data.task
  process.env.DIGEST_HOUR = '0'
  const first  = await runReminders(new Date())
  const overdueTotal = (await Task.find(Task.overdueFilter())).length
  check('overdue reminder per overdue task', (await Notification.countDocuments({ type: 'overdue' })) === overdueTotal, `${overdueTotal}`)
  check('due-soon reminder for task due within 24 h', (await Notification.countDocuments({ type: 'due_soon', task: soonTask.id })) === 1)
  check('reminder emailed to assignee', mailTo('writer@t.com').some((m) => m.subject.startsWith('Due soon')))
  check('personal digest emailed', mailTo('exec@t.com').some((m) => m.subject.startsWith('Your tasks today')))
  check('team summary emailed to managers', ['admin@t.com', 'lead@t.com', 'mm@t.com'].every((e) => mailTo(e).some((m) => m.subject.startsWith('Team summary'))))
  const sent = outbox.length
  const second = await runReminders(new Date())
  check('re-running sends nothing new', second.created === 0 && outbox.length === sent && !second.digestsSent, JSON.stringify(second))
  check('first run created reminders', first.created > 0)
  process.env.DIGEST_HOUR = '24'
  await Notification.deleteMany({ type: 'digest' })
  await runReminders(new Date())
  check('no digest before DIGEST_HOUR', (await Notification.countDocuments({ type: 'digest' })) === 0)

  section('11. Checklist')
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/checklist`, { text: '  Write meta titles  ' })
  check('assignee adds a step', r.status === 201 && r.data.checklist[0].text === 'Write meta titles' && r.data.checklist[0].id)
  const step = r.data.checklist[0].id
  await call(tok.exec, 'POST', `/tasks/${execTask.id}/checklist`, { text: 'Submit sitemap' })
  r = await call(tok.exec, 'PATCH', `/tasks/${execTask.id}/checklist/${step}`, { done: true })
  check('tick a step (records when / who)', r.data.checklist[0].done && r.data.checklist[0].doneAt && r.data.checklist[0].doneBy === id('exec'))
  r = await call(tok.exec, 'PATCH', `/tasks/${execTask.id}/checklist/${step}`, { done: 'yes' })
  check('non-boolean done rejected', r.status === 400)
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/checklist`, { text: '   ' })
  check('empty step rejected', r.status === 400)
  r = await call(tok.mm, 'PATCH', `/tasks/${execTask.id}/checklist/${step}`, { done: false })
  check('manager can untick', r.status === 200 && !r.data.checklist[0].done && r.data.checklist[0].doneAt === null)
  r = await call(tok.exec, 'PATCH', `/tasks/${execTask.id}/checklist/${new mongoose.Types.ObjectId()}`, { done: true })
  check('unknown step → 404', r.status === 404)
  r = await call(tok.exec, 'DELETE', `/tasks/${execTask.id}/checklist/${step}`)
  check('delete step', r.status === 200 && r.data.checklist.length === 1)
  r = await call(tok.exec, 'GET', `/tasks/${execTask.id}`)
  check('checklist returned with the task', r.data.task.checklist.length === 1)

  section('12. Attachments')
  const form = (content, name, type) => { const f = new FormData(); f.append('file', new Blob([content], { type }), name); return f }
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, form('hello report', 'Report é.txt', 'text/plain'))
  check('assignee uploads a file', r.status === 201 && r.data.attachment.size === 12 && r.data.attachment.filename === 'Report é.txt', JSON.stringify(r.data))
  const att = r.data.attachment
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, form('a,b', 'data.csv', 'application/octet-stream'))
  check('generic browser type resolved by extension', r.status === 201 && r.data.attachment.contentType === 'text/csv')
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, form('MZ', 'tool.exe', 'application/x-msdownload'))
  check('disallowed type → 415', r.status === 415)
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, form('<svg onload=alert(1)>', 'x.svg', 'image/svg+xml'))
  check('SVG (script-capable) rejected', r.status === 415)
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, form(Buffer.alloc(10 * 1024 * 1024 + 1), 'big.pdf', 'application/pdf'))
  check('file over 10 MB → 413', r.status === 413)
  r = await call(tok.exec, 'POST', `/tasks/${execTask.id}/attachments`, new FormData())
  check('no file → 400', r.status === 400)
  r = await call(tok.writer, 'POST', `/tasks/${execTask.id}/attachments`, form('x', 'x.txt', 'text/plain'))
  check('user without access cannot upload', r.status === 403)
  r = await call(tok.exec, 'GET', `/tasks/${execTask.id}/attachments`)
  check('list attachments', r.data.attachments.length === 2 && r.data.attachments[0].user.name === 'exec')
  r = await fetch(`${base}/tasks/${execTask.id}/attachments/${att.id}/download`, { headers: { Authorization: `Bearer ${tok.mm}` } })
  const disposition = r.headers.get('content-disposition') || ''
  check('download returns the bytes', r.status === 200 && (await r.text()) === 'hello report')
  check('download is forced as attachment with UTF-8 name', disposition.startsWith('attachment') && disposition.includes("UTF-8''Report%20%C3%A9.txt"))
  r = await fetch(`${base}/tasks/${execTask.id}/attachments/${att.id}/download`, { headers: { Authorization: `Bearer ${tok.writer}` } })
  check('download needs task access', r.status === 403)
  r = await fetch(`${base}/tasks/${writerTask.id}/attachments/${att.id}/download`, { headers: { Authorization: `Bearer ${tok.admin}` } })
  check('attachment id must belong to the task in the URL', r.status === 404)
  r = await call(tok.mm, 'DELETE', `/tasks/${execTask.id}/attachments/${att.id}`)
  check('non-uploader, non-admin cannot delete', r.status === 403)
  r = await call(tok.exec, 'GET', `/tasks/${execTask.id}`)
  check('task shows attachment count', r.data.task._count.attachments === 2)
  r = await call(tok.exec, 'GET', `/tasks/${execTask.id}/activity`)
  check('upload logged in activity', r.data.activity.some((a) => a.action === 'attached' && a.newValue === 'Report é.txt'))
  const files = mongoose.connection.db.collection('attachments.files')
  check('file bytes stored in GridFS', (await files.countDocuments()) === 2)
  r = await call(tok.admin, 'DELETE', `/tasks/${execTask.id}/attachments/${att.id}`)
  check('admin can delete', r.status === 200 && (await files.countDocuments()) === 1)
  r = await call(tok.admin, 'DELETE', `/tasks/${execTask.id}`)
  check('deleting a task removes its attachments, files and notifications', r.status === 200
    && (await Attachment.countDocuments({ task: execTask.id })) === 0 && (await files.countDocuments()) === 0
    && (await Notification.countDocuments({ task: execTask.id })) === 0)

  section('13. Team trends')
  r = await call(tok.admin, 'GET', '/members/trends?weeks=4')
  const doneNow = await Task.find({ status: 'done' }).lean()
  check('trends: one row per member, 4 weekly windows', r.status === 200 && r.data.members.length === 7 && r.data.weeks.length === 4 && r.data.team.weekly.length === 4)
  check('team completed = done tasks in window', r.data.team.completed === doneNow.length && r.data.team.weekly.reduce((a, b) => a + b, 0) === doneNow.length, JSON.stringify(r.data.team))
  const execTrend = r.data.members.find((m) => m.name === 'exec')
  // exec's only done task was created already done with a due date 5 days ago → late
  check('on-time rate: finished after due date counts as late', execTrend.completed === 1 && execTrend.onTimeRate === 0)
  const writerTrend = r.data.members.find((m) => m.name === 'writer')
  check('on-time rate: finished before due date counts as on time', writerTrend.onTimeRate === 100)
  check('no completed work → null rates, not NaN', r.data.members.find((m) => m.name === 'idle').onTimeRate === null && r.data.members.find((m) => m.name === 'idle').avgDays === null)
  r = await call(tok.exec, 'GET', '/members/trends')
  check('team member sees only own trend', r.data.members.length === 1 && r.data.members[0].id === id('exec'))
  r = await call(tok.exec, 'GET', `/members/trends?member=${id('writer')}`)
  check("team member can't see someone else's trend", r.status === 403)
  r = await call(tok.mm, 'GET', `/members/trends?member=${id('writer')}&weeks=999`)
  check('weeks capped at 26', r.data.weeks.length === 26)

  section('14. Project progress')
  const proj = await Project.create({ name: 'Launch', website: site._id, creator: users.admin._id })
  await Task.updateMany({ _id: { $in: [created[6].id, created[7].id, created[8].id] } }, { project: proj._id })
  r = await call(tok.admin, 'GET', `/projects?websiteId=${site._id}`)
  const p = r.data.projects.find((x) => x.name === 'Launch')
  check('project progress = done / total, overdue counted', p.progress.total === 3 && p.progress.completed === 1 && p.progress.overdue === 1 && p.progress.completionRate === 33, JSON.stringify(p.progress))

  section('15. Backfill script')
  const legacy = await Task.collection.insertOne({ title: 'legacy', website: site._id, category: 'other', status: 'done', assignee: users.exec._id, creator: users.admin._id, createdAt: new Date(now - 20 * day), updatedAt: new Date(now - 10 * day) })
  const script = path.join(SERVER, 'scripts/backfill-completedAt.js')
  const env = { ...process.env, MONGODB_URI: uri }
  const dry = execFileSync('node', [script], { env, cwd: SERVER }).toString()
  check('dry run reports the task and writes nothing', dry.includes('1 done task(s)') && (await Task.collection.findOne({ _id: legacy.insertedId })).completedAt === undefined)
  execFileSync('node', [script, '--apply'], { env, cwd: SERVER })
  check('apply fills completedAt from updatedAt', +(await Task.collection.findOne({ _id: legacy.insertedId })).completedAt === now - 10 * day)

  console.log(`\n${pass} passed, ${fail} failed`)
  server.close(); await mongoose.disconnect(); await mem.stop()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
