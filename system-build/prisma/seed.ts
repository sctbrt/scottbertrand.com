// Seed script for initial admin user
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminEmail = 'hello@bertrandbrands.com'

  const existingUser = await prisma.users.findUnique({
    where: { email: adminEmail },
  })

  if (existingUser) {
    // Update to admin if not already
    if (existingUser.role !== 'INTERNAL_ADMIN') {
      await prisma.users.update({
        where: { email: adminEmail },
        data: {
          role: 'INTERNAL_ADMIN',
          name: 'Scott Bertrand',
        },
      })
      console.log(`Updated ${adminEmail} to INTERNAL_ADMIN role`)
    } else {
      console.log(`Admin user ${adminEmail} already exists`)
    }
  } else {
    await prisma.users.create({
      data: {
        email: adminEmail,
        name: 'Scott Bertrand',
        role: 'INTERNAL_ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log(`Created admin user: ${adminEmail}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
