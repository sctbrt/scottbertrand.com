/**
 * Notification utilities for Bertrand Brands
 *
 * Sends push notifications via Pushover for important events:
 * - Payment received
 * - Refund processed
 * - Dispute created (urgent)
 */

interface PaymentNotificationData {
  type: 'payment' | 'refund' | 'dispute'
  amount: number
  currency: string
  projectName: string
  projectId?: string
  chargeId?: string
  disputeId?: string
  reason?: string
  priority?: number // -2 to 2, default 0. 1 = high priority
  isPartialRefund?: boolean
  originalAmount?: number
}

/**
 * Send a payment-related notification via Pushover.
 * Fails silently - notifications should never break payment processing.
 */
export async function sendPaymentNotification(data: PaymentNotificationData): Promise<void> {
  const { type, amount, currency, projectName, projectId, chargeId, disputeId, reason, priority } =
    data

  // Check for required env vars
  const token = process.env.PUSHOVER_API_TOKEN
  const user = process.env.PUSHOVER_USER_KEY

  if (!token || !user) {
    console.warn('[Notifications] PUSHOVER credentials not configured, skipping notification')
    return
  }

  // Build message based on type
  let title: string
  let message: string
  let url: string | undefined
  let urlTitle: string | undefined

  const formattedAmount = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(amount)

  switch (type) {
    case 'payment':
      title = '💰 Payment Received'
      message = `${formattedAmount} received for ${projectName}`
      if (projectId) {
        url = `https://dash.bertrandgroup.ca/projects/${projectId}`
        urlTitle = 'View Project'
      }
      break

    case 'refund':
      if (data.isPartialRefund) {
        title = '↩️ Partial Refund'
        const formattedOriginal = data.originalAmount
          ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: currency || 'CAD' }).format(data.originalAmount)
          : null
        message = `${formattedAmount} of ${formattedOriginal || 'original'} refunded for ${projectName}`
      } else {
        title = '↩️ Full Refund'
        message = `${formattedAmount} refunded for ${projectName}`
      }
      if (chargeId) {
        message += `\nCharge: ${chargeId}`
      }
      if (projectId) {
        url = `https://dash.bertrandgroup.ca/projects/${projectId}`
        urlTitle = 'View Project'
      }
      break

    case 'dispute':
      title = '⚠️ DISPUTE ALERT'
      message = `${formattedAmount} disputed for ${projectName}`
      if (reason) {
        message += `\nReason: ${reason}`
      }
      if (disputeId) {
        message += `\nDispute ID: ${disputeId}`
        url = `https://dashboard.stripe.com/disputes/${disputeId}`
        urlTitle = 'View in Stripe'
      }
      break
  }

  try {
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user,
        message,
        title,
        url,
        url_title: urlTitle,
        priority: priority ?? (type === 'dispute' ? 1 : 0), // Disputes are high priority by default
        sound: type === 'dispute' ? 'siren' : 'cashregister',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Notifications] Pushover API error:', errorText)
    } else {
      console.log(`[Notifications] Sent ${type} notification for ${projectName}`)
    }
  } catch (error) {
    // Fail silently - don't break payment processing
    console.error('[Notifications] Failed to send notification:', error)
  }
}

/**
 * Send a generic notification via Pushover.
 */
export async function sendNotification({
  title,
  message,
  url,
  urlTitle,
  priority = 0,
  sound,
}: {
  title: string
  message: string
  url?: string
  urlTitle?: string
  priority?: number
  sound?: string
}): Promise<void> {
  const token = process.env.PUSHOVER_API_TOKEN
  const user = process.env.PUSHOVER_USER_KEY

  if (!token || !user) {
    console.warn('[Notifications] PUSHOVER credentials not configured, skipping notification')
    return
  }

  try {
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user,
        message,
        title,
        url,
        url_title: urlTitle,
        priority,
        sound,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Notifications] Pushover API error:', errorText)
    }
  } catch (error) {
    console.error('[Notifications] Failed to send notification:', error)
  }
}
