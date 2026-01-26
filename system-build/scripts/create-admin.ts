// Script to create the initial admin user
// Run with: npx tsx scripts/create-admin.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.argv[2] || 'scott@scottbertrand.com'

  // Check if user already exists
  const existing = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (existing) {
    if (existing.role === 'INTERNAL_ADMIN') {
      console.log(`✓ Admin user already exists: ${adminEmail}`)
      return
    }

    // Upgrade to admin
    await prisma.users.update({
      where: { email: adminEmail },
      data: { role: 'INTERNAL_ADMIN' }
    })
    console.log(`✓ Upgraded existing user to admin: ${adminEmail}`)
    return
  }

  // Create new admin user
  const user = await prisma.users.create({
    data: {
      email: adminEmail,
      name: 'Scott Bertrand',
      role: 'INTERNAL_ADMIN',
      emailVerified: new Date(), // Pre-verify admin
    }
  })

  console.log(`✓ Created admin user: ${user.email}`)
  console.log(`  ID: ${user.id}`)
  console.log(`  Role: ${user.role}`)
  console.log('')
  console.log('You can now sign in at dashboard.scottbertrand.com')
  console.log('(Or system-build.vercel.app for now until DNS is configured)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
