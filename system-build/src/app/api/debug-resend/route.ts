// TEMPORARY: Debug endpoint to test Resend directly
// DELETE THIS FILE AFTER USE

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Check environment variables
  const envCheck = {
    AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY ? 'SET' : 'NOT SET',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
    AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  }

  console.log('[Debug] Environment check:', envCheck)

  // Get the API key
  const apiKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      error: 'No Resend API key found',
      envCheck,
    }, { status: 500 })
  }

  try {
    // Import and initialize Resend
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    console.log('[Debug] Attempting to send test email to:', email)

    // Send a test email
    const result = await resend.emails.send({
      from: 'Bertrand Brands <hello@bertrandbrands.com>',
      to: email,
      subject: 'Test Email from Debug Endpoint',
      html: '<p>This is a test email to verify Resend is working.</p>',
      text: 'This is a test email to verify Resend is working.',
    })

    console.log('[Debug] Resend result:', JSON.stringify(result))

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
        envCheck,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      envCheck,
      message: 'Email sent successfully! Check your inbox.',
    })
  } catch (error) {
    console.error('[Debug] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      envCheck,
    }, { status: 500 })
  }
}
