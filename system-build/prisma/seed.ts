// Seed script for initial admin user and service templates
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Service templates (async-first model)
const serviceTemplates = [
  {
    name: 'Micro-Consult',
    slug: 'micro-consult',
    description: 'Submit up to 3 focused questions. Receive a 10–15 minute recorded walkthrough with written summary.',
    price: 95,
    estimatedDays: 3,
    sortOrder: 1,
    deliverables: ['Recorded walkthrough (10-15 min)', 'Written summary'],
    scope: { questions: 3 },
  },
  {
    name: 'Website Snapshot Review',
    slug: 'website-snapshot',
    description: 'A focused evaluation of your existing website. Homepage clarity, messaging alignment, and friction points.',
    price: 225,
    estimatedDays: 5,
    sortOrder: 2,
    deliverables: ['Annotated PDF (6-8 pages)', 'Prioritized recommendations'],
  },
  {
    name: 'Brand Clarity Review',
    slug: 'brand-clarity',
    description: 'A focused evaluation of what your brand is communicating today—and where it\'s misaligned.',
    price: 295,
    estimatedDays: 5,
    sortOrder: 3,
    deliverables: ['Brand Direction Memo (PDF)'],
  },
  {
    name: 'Strategic Website Review',
    slug: 'strategic-website-review',
    description: 'Comprehensive website assessment including structure, content effectiveness, technical considerations, and competitive context.',
    price: 425,
    estimatedDays: 7,
    sortOrder: 4,
    deliverables: ['Strategic Website Report (10-12 pages)'],
  },
  {
    name: 'Strategic Brand Review',
    slug: 'strategic-brand-review',
    description: 'Deep brand assessment covering positioning, market context, competitive analysis, and strategic direction.',
    price: 550,
    estimatedDays: 7,
    sortOrder: 5,
    deliverables: ['Strategic Brand Assessment (PDF)'],
  },
  {
    name: 'Brand Reset',
    slug: 'brand-reset',
    description: 'Complete brand identity system including positioning, visual identity, and comprehensive brand guidelines.',
    price: 2750,
    estimatedDays: 21,
    sortOrder: 6,
    deliverables: ['Brand Reset Document (PDF)', 'Logo files (SVG, PNG, EPS)', 'Brand guidelines', 'Asset package'],
  },
  {
    name: 'Website Foundation',
    slug: 'website-foundation',
    description: 'Full website build: content strategy, visual design, development, and deployment.',
    price: 3950,
    estimatedDays: 28,
    sortOrder: 7,
    deliverables: ['Website Foundation Blueprint (PDF)', 'Live website', 'Source code', '30-day support'],
    scope: { pages: 7 },
  },
  {
    name: 'Brand + Website Reset',
    slug: 'brand-website-reset',
    description: 'Complete brand and website package. Everything you need to establish or refresh your digital presence.',
    price: 6500,
    estimatedDays: 42,
    sortOrder: 8,
    deliverables: ['Brand Reset Document', 'Website Foundation Blueprint', 'Live website', 'Complete asset package'],
  },
  {
    name: 'Async Advisory',
    slug: 'async-advisory',
    description: 'Monthly retained support for ongoing brand and website guidance. Includes 2 Micro-Consults per month.',
    price: 450,
    estimatedDays: null,
    sortOrder: 9,
    deliverables: ['2 Micro-Consults per month', 'Priority async responses', 'Recorded walkthroughs'],
    scope: { recurring: true, period: 'month' },
  },
  {
    name: 'Phone Consultation',
    slug: 'phone-consultation',
    description: 'A 45-minute phone or video call for clarification when async communication isn\'t enough.',
    price: 125,
    estimatedDays: 2,
    sortOrder: 10,
    deliverables: ['45-minute call (phone or video)'],
    scope: { duration: 45, unit: 'minutes' },
  },
]

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

  // Upsert service templates
  console.log('Seeding service templates...')

  for (const template of serviceTemplates) {
    await prisma.service_templates.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        price: template.price,
        estimatedDays: template.estimatedDays,
        sortOrder: template.sortOrder,
        deliverables: template.deliverables,
        scope: template.scope ?? Prisma.JsonNull,
        isActive: true,
      },
      create: {
        name: template.name,
        slug: template.slug,
        description: template.description,
        price: template.price,
        estimatedDays: template.estimatedDays,
        sortOrder: template.sortOrder,
        deliverables: template.deliverables,
        scope: template.scope ?? Prisma.JsonNull,
        isActive: true,
      },
    })
    console.log(`  ✓ ${template.name}`)
  }

  // Deactivate old service templates that no longer exist
  const activeServiceSlugs = serviceTemplates.map(t => t.slug)
  await prisma.service_templates.updateMany({
    where: {
      slug: { notIn: activeServiceSlugs },
      isActive: true,
    },
    data: { isActive: false },
  })

  console.log('Service templates seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
