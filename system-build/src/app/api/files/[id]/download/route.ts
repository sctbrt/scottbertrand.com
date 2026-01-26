// File Download API Route
// Provides secure file downloads with signed URLs and access control

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkFileAccess, validateDownloadToken } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const expires = searchParams.get('expires')

    // Method 1: Signed URL validation (for shared links)
    if (token && expires) {
      const isValid = validateDownloadToken(fileId, token, expires)

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired download link' },
          { status: 403 }
        )
      }
    } else {
      // Method 2: Session-based authentication
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check access permissions
      const hasAccess = await checkFileAccess({
        fileId,
        userId: session.user.id,
        userRole: session.user.role,
      })

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Get file from database
    const file = await prisma.file_assets.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Fetch the file from Vercel Blob
    const response = await fetch(file.url)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file' },
        { status: 500 }
      )
    }

    // Get the file data
    const fileData = await response.arrayBuffer()

    // Return the file with appropriate headers
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
