require('dotenv').config()
const crypto = require('crypto')
const mongoose = require('mongoose')
const { connectDB } = require('../src/config/db')
const { User } = require('../src/models')

const users = [
  { name: 'Admin User',    email: 'admin@seoteam.com', role: 'super_admin' },
  { name: 'Sarah Johnson', email: 'sarah@seoteam.com', role: 'team_lead' },
  { name: 'Mike Chen',     email: 'mike@seoteam.com',  role: 'seo_executive' },
  { name: 'Emily Davis',   email: 'emily@seoteam.com', role: 'content_writer' },
  { name: 'James Wilson',  email: 'james@seoteam.com', role: 'developer' },
  { name: 'Lisa Martinez', email: 'lisa@seoteam.com',  role: 'marketing_manager' },
]

// Random per-user password, printed once — never commit real credentials
const randomPassword = () => crypto.randomBytes(12).toString('base64url')

async function main() {
  await connectDB(process.env.MONGODB_URI)
  console.log('Seeding database...')

  const created = []
  for (const user of users) {
    // Existing users are left untouched
    const exists = await User.exists({ email: user.email })
    if (exists) {
      console.log(`  Skipped (exists): ${user.email}`)
      continue
    }
    const password = randomPassword()
    await User.create({ ...user, passwordHash: await User.hashPassword(password) })
    created.push({ ...user, password })
    console.log(`  Created: ${user.email} (${user.role})`)
  }

  if (created.length) {
    console.log('\nSeed complete! Save these passwords now, they are not shown again:')
    for (const u of created) console.log(`  ${u.role.padEnd(18)}: ${u.email.padEnd(20)} / ${u.password}`)
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
