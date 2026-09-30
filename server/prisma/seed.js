const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const users = [
  { name: 'Admin User',    email: 'admin@seoteam.com', password: 'admin123',    role: 'super_admin' },
  { name: 'Sarah Johnson', email: 'sarah@seoteam.com', password: 'password123', role: 'team_lead' },
  { name: 'Mike Chen',     email: 'mike@seoteam.com',  password: 'password123', role: 'seo_executive' },
  { name: 'Emily Davis',   email: 'emily@seoteam.com', password: 'password123', role: 'content_writer' },
  { name: 'James Wilson',  email: 'james@seoteam.com', password: 'password123', role: 'developer' },
  { name: 'Lisa Martinez', email: 'lisa@seoteam.com',  password: 'password123', role: 'marketing_manager' },
]

async function main() {
  console.log('Seeding database...')

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role, isActive: true },
    })
    console.log(`  Created: ${u.email} (${u.role})`)
  }

  console.log('\nSeed complete! Login credentials:')
  console.log('  Super Admin  : admin@seoteam.com  / admin123')
  console.log('  Team Lead    : sarah@seoteam.com  / password123')
  console.log('  SEO Executive: mike@seoteam.com   / password123')
  console.log('  Content Write: emily@seoteam.com  / password123')
  console.log('  Developer    : james@seoteam.com  / password123')
  console.log('  Mktg Manager : lisa@seoteam.com   / password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
