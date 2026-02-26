// Seed demo project for Client Portal testing
// Run with: npx tsx prisma/seed-demo-portal.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find or create a demo client user
  const demoEmail = 'demo@example.com'

  let demoUser = await prisma.users.findUnique({
    where: { email: demoEmail },
  })

  if (!demoUser) {
    demoUser = await prisma.users.create({
      data: {
        email: demoEmail,
        name: 'Alex Demo',
        role: 'CLIENT',
        emailVerified: new Date(),
      },
    })
    console.log('Created demo user:', demoUser.email)
  } else {
    console.log('Demo user already exists:', demoUser.email)
  }

  // Find or create client record
  let demoClient = await prisma.clients.findUnique({
    where: { userId: demoUser.id },
  })

  if (!demoClient) {
    demoClient = await prisma.clients.create({
      data: {
        userId: demoUser.id,
        contactName: 'Alex Demo',
        contactEmail: demoEmail,
        companyName: 'Demo Company',
        phone: '+1 555-123-4567',
        website: 'https://demo.example.com',
        notes: 'Demo client for portal testing',
      },
    })
    console.log('Created demo client:', demoClient.companyName)
  } else {
    console.log('Demo client already exists:', demoClient.companyName)
  }

  // Get a service template (V11 slug)
  const template = await prisma.service_templates.findFirst({
    where: {
      OR: [
        { slug: 'foundation-growth' },
        { slug: 'starter-onepage' },
      ]
    },
  })

  if (!template) {
    console.error('No service template found. Run main seed first.')
    return
  }

  // Check if demo project exists
  const existingProject = await prisma.projects.findFirst({
    where: {
      clientId: demoClient.id,
      name: 'Demo Company Website Redesign',
    },
  })

  if (existingProject) {
    console.log('Demo project already exists:', existingProject.name)
    return
  }

  // Create a demo project with milestones
  const project = await prisma.projects.create({
    data: {
      name: 'Demo Company Website Redesign',
      description: 'Complete website redesign with modern design system and improved conversion flow.',
      status: 'IN_PROGRESS',
      portalStage: 'IN_DELIVERY',
      paymentStatus: 'PAID',
      paymentRequired: true,
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      clientId: demoClient.id,
      serviceTemplateId: template.id,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      targetEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      scopeIncluded: [
        'Custom homepage design',
        'About page with team section',
        'Services overview page',
        'Contact form with validation',
        'Mobile-responsive layout',
        'Performance optimization',
        'SEO meta tags setup',
      ],
      scopeExcluded: 'E-commerce functionality, blog setup, and third-party integrations are not included in this phase.',
      revisionPolicy: '2 rounds of revisions included. Additional revisions billed at $95/hour.',
      nextMilestoneLabel: 'Design Review',
      nextMilestoneDueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      lastUpdateAt: new Date(),
      milestones: {
        create: [
          {
            name: 'Project Kickoff',
            description: 'Initial meeting and requirements gathering',
            status: 'COMPLETED',
            sortOrder: 1,
            completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Wireframes & Structure',
            description: 'Page layouts and content hierarchy',
            status: 'COMPLETED',
            sortOrder: 2,
            completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Visual Design',
            description: 'Full design mockups for all pages',
            status: 'IN_PROGRESS',
            sortOrder: 3,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Development',
            description: 'Build and code the website',
            status: 'PENDING',
            sortOrder: 4,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          },
          {
            name: 'Launch',
            description: 'Final review and go-live',
            status: 'PENDING',
            sortOrder: 5,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            requiresApproval: true,
          },
        ],
      },
    },
  })

  console.log('Created demo project:', project.name)
  console.log('')
  console.log('Portal login credentials:')
  console.log('  Email: demo@example.com')
  console.log('  (Use magic link authentication)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
