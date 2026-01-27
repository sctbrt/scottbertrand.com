// TEMPORARY: Debug endpoint to test Auth.js signIn flow
// DELETE THIS FILE AFTER USE

import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  console.log('[Debug Auth] Starting sign-in test for:', email)

  try {
    // Try to call signIn directly from the server
    console.log('[Debug Auth] Calling signIn...')

    const result = await signIn('resend', {
      email,
      redirect: false,
      redirectTo: '/dashboard',
    })

    console.log('[Debug Auth] signIn result:', result)

    return NextResponse.json({
      success: true,
      result: result,
      message: 'signIn called successfully',
    })
  } catch (error) {
    console.error('[Debug Auth] signIn error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5),
      } : String(error),
    }, { status: 500 })
  }
}
