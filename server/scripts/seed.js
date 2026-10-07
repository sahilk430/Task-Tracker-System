require('dotenv').config()
const mongoose = require('mongoose')
const { connectDB } = require('../src/config/db')
const { User } = require('../src/models')

const users = [
  { name: 'Admin User',    email: 'admin@seoteam.com', password: 'admin123',    role: 'super_admin' },
  { name: 'Sarah Johnson', email: 'sarah@seoteam.com', password: 'password123', role: 'team_lead' },
  { name: 'Mike Chen',     email: 'mike@seoteam.com',  password: 'password123', role: 'seo_executive' },
  { name: 'Emily Davis',   email: 'emily@seoteam.com', password: 'password123', role: 'content_writer' },
  { name: 'James Wilson',  email: 'james@seoteam.com', password: 'password123', role: 'developer' },
  { name: 'Lisa Martinez', email: 'lisa@seoteam.com',  password: 'password123', role: 'marketing_manager' },
]

async function main() {
  await connectDB(process.env.MONGODB_URI)
  console.log('Seeding database...')

  for (const { password, ...user } of users) {
    // Existing users are left untouched
    const exists = await User.exists({ email: user.email })
    if (exists) {
      console.log(`  Skipped (exists): ${user.email}`)
      continue
    }
    await User.create({ ...user, passwordHash: await User.hashPassword(password) })
    console.log(`  Created: ${user.email} (${user.role})`)
  }

  console.log('\nSeed complete! Login credentials:')
  for (const u of users) console.log(`  ${u.role.padEnd(18)}: ${u.email.padEnd(20)} / ${u.password}`)
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
