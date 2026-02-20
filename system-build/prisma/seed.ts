// Seed script for initial admin user and service templates
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Service templates - V11 tier architecture matching bertrandbrands.ca
// Organized into 3 tiers: B Build (Amber), B Transform (Violet), B Care (Blue)
const serviceTemplates = [
  // === B Build (Amber #D97706) — Quick Builds ===
  {
    name: 'Starter Site — One-Page + Contact',
    slug: 'starter-onepage',
    description: 'Single-page marketing website with contact form. Mobile-first, fast-loading, built to convert.',
    price: 750,
    estimatedDays: 10,
    sortOrder: 1,
    deliverables: ['One-page marketing website', 'Mobile-first responsive design', 'Contact form', 'Basic SEO setup', 'Google Analytics'],
    scope: { tier: 'build', color: 'amber', revisions: 1, meetings: 0 },
  },
  {
    name: 'Starter Site — Multi-Page + Contact',
    slug: 'starter-multipage',
    description: '3–5 page marketing website with contact form. For growing businesses that need multiple service pages.',
    price: 0, // Scoped pricing
    estimatedDays: 21,
    sortOrder: 2,
    deliverables: ['3–5 page marketing website', 'Mobile-first responsive design', 'Contact form', 'SEO setup', 'Google Analytics'],
    scope: { tier: 'build', color: 'amber', revisions: 2, meetings: 0, pricingType: 'scoped' },
  },
  {
    name: 'Full Site — Multi-Page + Booking',
    slug: 'fullsite-booking',
    description: '5–10 page website with booking or scheduling integration. For service businesses ready to take appointments online.',
    price: 0, // Scoped pricing
    estimatedDays: 28,
    sortOrder: 3,
    deliverables: ['5–10 page website', 'Booking/scheduling integration', 'Mobile-first responsive design', 'Contact form', 'SEO setup', 'Google Analytics'],
    scope: { tier: 'build', color: 'amber', revisions: 2, meetings: 0, pricingType: 'scoped' },
  },
  // === B Transform (Violet #8B5CF6) — Bigger Commitments ===
  {
    name: 'Website Foundation + Growth System',
    slug: 'foundation-growth',
    description: 'For businesses that have outgrown their current site. Discovery-led website build with growth strategy.',
    price: 0, // Scoped pricing
    estimatedDays: 56,
    sortOrder: 4,
    deliverables: ['Discovery session', 'Foundation brief', 'Custom website build', 'Growth system setup', 'QA + launch support'],
    scope: { tier: 'transform', color: 'violet', meetings: '2-4', pricingType: 'scoped' },
  },
  {
    name: 'SMB Platform Development',
    slug: 'smb-platform',
    description: 'For established businesses with multiple systems. Full platform development with integrations.',
    price: 0, // Scoped pricing
    estimatedDays: 84,
    sortOrder: 5,
    deliverables: ['Discovery + systems audit', 'Platform architecture', 'Custom development', 'Integration setup', 'QA + launch support', 'Training session'],
    scope: { tier: 'transform', color: 'violet', meetings: '2-4', pricingType: 'scoped' },
  },
  {
    name: 'Brand Design + Platform Development',
    slug: 'brand-platform',
    description: 'Full rebrand and digital platform build. The complete transformation, end to end.',
    price: 0, // Scoped pricing
    estimatedDays: 112,
    sortOrder: 6,
    deliverables: ['Brand discovery', 'Visual identity system', 'Brand guidelines', 'Custom platform build', 'Integration setup', 'QA + launch support', 'Training session'],
    scope: { tier: 'transform', color: 'violet', meetings: '2-4', pricingType: 'scoped' },
  },
  // === B Care (Blue #2563EB) — Ongoing Support ===
  {
    name: 'Care — Bronze',
    slug: 'bronze',
    description: 'Essential website maintenance. 4 credits per month, 3–5 day turnaround.',
    price: 249,
    estimatedDays: null,
    sortOrder: 7,
    deliverables: ['4 credits/month', 'Response within 1 business day', '3–5 day turnaround', 'Monthly summary'],
    scope: { tier: 'care', color: 'blue', plan: 'ESSENTIALS', credits: 4, pricingType: 'monthly' },
  },
  {
    name: 'Care — Silver',
    slug: 'silver',
    description: 'Active growth support. 10 credits per month, 1–3 day turnaround.',
    price: 649,
    estimatedDays: null,
    sortOrder: 8,
    deliverables: ['10 credits/month', 'Same or next business day response', '1–3 day turnaround', 'Monthly optional meeting', 'Monthly summary'],
    scope: { tier: 'care', color: 'blue', plan: 'GROWTH', credits: 10, pricingType: 'monthly' },
  },
  {
    name: 'Care — Gold',
    slug: 'gold',
    description: 'Premium partnership. 24 credits per month, same-day response. Limited seats.',
    price: 0, // By application
    estimatedDays: null,
    sortOrder: 9,
    deliverables: ['24 credits/month', 'Same business day response', '24–72 hour turnaround target', '1–2x monthly meetings', 'Monthly summary', 'Priority queue'],
    scope: { tier: 'care', color: 'blue', plan: 'PARTNER', credits: 24, pricingType: 'application' },
  },
]

async function main() {
  // Create admin users
  const adminEmails = [
    'hello@bertrandbrands.com',
    'bertrandbrands@outlook.com',
    'sctbrt01@gmail.com',
  ]

  for (const adminEmail of adminEmails) {
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
