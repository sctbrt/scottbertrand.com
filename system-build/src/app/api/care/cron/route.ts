/**
 * Care Credit Expiry Cron Job
 *
 * Runs daily to sweep expired credit lots and forfeit unused credits.
 * Secured via CRON_SECRET environment variable (Vercel Cron).
 *
 * Vercel Cron config: Add to vercel.json:
 * { "crons": [{ "path": "/api/care/cron", "schedule": "0 6 * * *" }] }
 *
 * Runs at 6:00 AM UTC daily (1:00 AM EST / 2:00 AM EDT).
 */

import { NextResponse } from 'next/server'
import { sweepExpiredLots } from '@/lib/care-credits'

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sweepExpiredLots()

    console.log(
      `[Care Cron] Expiry sweep complete: ${result.lotsExpired} lots expired, ${result.creditsForfeited} credits forfeited`
    )

    return NextResponse.json({
      success: true,
      lotsExpired: result.lotsExpired,
      creditsForfeited: result.creditsForfeited,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Care Cron] Expiry sweep failed:', error)
    return NextResponse.json(
      { error: 'Expiry sweep failed' },
      { status: 500 }
    )
  }
}
