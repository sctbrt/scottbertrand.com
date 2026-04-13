// Seed test client for Client Portal testing
// Run with: npx tsx prisma/seed-test-client.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Test client details
  const testEmail = 'sctbrt01@gmail.com'
  const testName = 'Scott Bertrand (Test Client)'
  const companyName = 'Test Client Co.'

  // Find or create the test client user
  let testUser = await prisma.users.findUnique({
    where: { email: testEmail },
  })

  if (!testUser) {
    testUser = await prisma.users.create({
      data: {
        email: testEmail,
        name: testName,
        role: 'CLIENT',
        emailVerified: new Date(),
      },
    })
    console.log('✓ Created test user:', testUser.email)
  } else {
    console.log('→ Test user already exists:', testUser.email)
  }

  // Find or create client record
  let testClient = await prisma.clients.findUnique({
    where: { userId: testUser.id },
  })

  if (!testClient) {
    testClient = await prisma.clients.create({
      data: {
        userId: testUser.id,
        contactName: testName,
        contactEmail: testEmail,
        companyName: companyName,
        phone: '+1 705-413-3705',
        website: 'https://bertrandbrands.ca',
        notes: 'Test client account for portal development and testing',
      },
    })
    console.log('✓ Created test client:', testClient.companyName)
  } else {
    console.log('→ Test client already exists:', testClient.companyName)
  }

  // Get a service template (V11 slugs)
  const template = await prisma.service_templates.findFirst({
    where: {
      OR: [
        { slug: 'foundation-growth' },
        { slug: 'starter-onepage' },
        { slug: 'brand-platform' }
      ]
    },
  })

  // Check if test project exists
  const existingProject = await prisma.projects.findFirst({
    where: {
      clientId: testClient.id,
      name: 'Test Client Portal Project',
    },
  })

  if (existingProject) {
    console.log('→ Test project already exists:', existingProject.name)
    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('Test Client Portal Credentials:')
    console.log('  Email: sctbrt01@gmail.com')
    console.log('  Portal: https://clients.bertrandbrands.ca')
    console.log('  (Use magic link / email authentication)')
    console.log('═══════════════════════════════════════════')
    return
  }

  // Create a test project with milestones
  const project = await prisma.projects.create({
    data: {
      name: 'Test Client Portal Project',
      description: 'A test project to verify client portal functionality including deliverables, milestones, and payment flow.',
      status: 'IN_PROGRESS',
      portalStage: 'IN_DELIVERY',
      paymentStatus: 'PAID', // Set to PAID so we can test deliverable access
      paymentRequired: true,
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      clientId: testClient.id,
      serviceTemplateId: template?.id || null,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      targetEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      scopeIncluded: [
        'Portal access testing',
        'Deliverable upload testing',
        'Milestone tracking verification',
        'Payment flow validation',
        'Feedback submission testing',
      ],
      scopeExcluded: 'This is a test project for development purposes only.',
      revisionPolicy: 'Unlimited revisions for testing purposes.',
      nextMilestoneLabel: 'Review Deliverables',
      nextMilestoneDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      lastUpdateAt: new Date(),
      milestones: {
        create: [
          {
            name: 'Portal Setup',
            description: 'Initial portal configuration and access verification',
            status: 'COMPLETED',
            sortOrder: 1,
            completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Deliverable Testing',
            description: 'Upload and preview test deliverables',
            status: 'IN_PROGRESS',
            sortOrder: 2,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Feedback Testing',
            description: 'Test client feedback and approval workflow',
            status: 'PENDING',
            sortOrder: 3,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            requiresApproval: true,
          },
          {
            name: 'Final Review',
            description: 'Complete portal testing and sign-off',
            status: 'PENDING',
            sortOrder: 4,
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            requiresApproval: true,
          },
        ],
      },
    },
  })

  console.log('✓ Created test project:', project.name)
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('Test Client Portal Credentials:')
  console.log('  Email: sctbrt01@gmail.com')
  console.log('  Portal: https://clients.bertrandbrands.ca')
  console.log('  (Use magic link / email authentication)')
  console.log('═══════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
