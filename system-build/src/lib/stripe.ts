/**
 * Stripe Client Configuration
 *
 * Singleton Stripe client for server-side operations.
 * See docs/stripe-setup.md for configuration steps.
 */

import Stripe from 'stripe'

// Get Stripe secret key (validated at runtime, not build time)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Create Stripe client lazily (singleton pattern for hot reloading)
const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined }

function getStripeClient(): Stripe {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }

  return globalForStripe.stripe
}

// Export a getter that validates the key at runtime
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient()
    const value = client[prop as keyof Stripe]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Stripe metadata keys we use for Payment Links
 */
export const STRIPE_METADATA_KEYS = {
  PROJECT_PUBLIC_ID: 'project_public_id',
  ENVIRONMENT: 'environment',
  PURPOSE: 'purpose',
  CLIENT_ID: 'client_id',
} as const

/**
 * Expected metadata purpose values
 */
export const STRIPE_PURPOSES = {
  PROJECT_PAYMENT: 'project_payment',
  CARE_SUBSCRIPTION: 'care_subscription',
} as const

/**
 * Stripe metadata keys for Care subscriptions
 */
export const CARE_METADATA_KEYS = {
  CLIENT_ID: 'client_id',
  CARE_PLAN: 'care_plan',
  ENVIRONMENT: 'environment',
  PURPOSE: 'purpose',
} as const
