// File Storage Utilities with Vercel Blob
// Provides signed URLs for secure file access

import { put, del } from '@vercel/blob'
import crypto from 'crypto'
import { prisma } from './prisma'
import { v4 as uuidv4 } from 'uuid'

// Upload a file to Vercel Blob storage
export async function uploadFile({
  file,
  filename,
  projectId,
  accessLevel = 'PRIVATE',
  uploadedById,
}: {
  file: Blob | Buffer
  filename: string
  projectId?: string
  accessLevel?: 'PUBLIC' | 'PRIVATE' | 'CLIENT_VISIBLE'
  uploadedById?: string
}) {
  // Generate unique filename to prevent collisions
  const uniqueFilename = `${uuidv4()}-${filename}`
  const pathname = projectId ? `projects/${projectId}/${uniqueFilename}` : `files/${uniqueFilename}`

  // Upload to Vercel Blob
  const blob = await put(pathname, file, {
    access: 'public', // All files use signed URLs for actual access control
    addRandomSuffix: false,
  })

  // Get file metadata
  const buffer = file instanceof Blob ? await file.arrayBuffer() : file
  const mimeType = file instanceof Blob ? file.type : 'application/octet-stream'

  // Create database record
  const fileAsset = await prisma.file_assets.create({
    data: {
      filename: uniqueFilename,
      originalName: filename,
      mimeType,
      size: buffer.byteLength,
      url: blob.url,
      accessLevel,
      projectId,
      uploadedById,
    },
  })

  return fileAsset
}

// Delete a file from storage and database
export async function deleteFile(fileId: string) {
  const file = await prisma.file_assets.findUnique({
    where: { id: fileId },
  })

  if (!file) {
    throw new Error('File not found')
  }

  // Delete from Vercel Blob
  await del(file.url)

  // Delete from database
  await prisma.file_assets.delete({
    where: { id: fileId },
  })

  return true
}

// Get file metadata
export async function getFileMetadata(fileId: string) {
  return prisma.file_assets.findUnique({
    where: { id: fileId },
    include: {
      projects: {
        select: { id: true, name: true, clientId: true },
      },
    },
  })
}

// Check if user has access to a file
export async function checkFileAccess({
  fileId,
  userId,
  userRole,
}: {
  fileId: string
  userId: string
  userRole: 'INTERNAL_ADMIN' | 'CLIENT'
}): Promise<boolean> {
  const file = await prisma.file_assets.findUnique({
    where: { id: fileId },
    include: {
      projects: {
        include: {
          clients: {
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!file) {
    return false
  }

  // Admin has access to all files
  if (userRole === 'INTERNAL_ADMIN') {
    return true
  }

  // Public files are accessible to anyone
  if (file.accessLevel === 'PUBLIC') {
    return true
  }

  // Client-visible files require ownership check
  // file.projects.clients is a single client record (not an array) linked to the project
  if (file.accessLevel === 'CLIENT_VISIBLE' && file.projects?.clients?.userId) {
    return file.projects.clients.userId === userId
  }

  // Private files are admin-only
  return false
}

// Generate a time-limited signed URL for file download
// Since Vercel Blob uses public URLs, we implement our own access control
// via the download endpoint
export function generateDownloadUrl(fileId: string, expiresIn: number = 3600): string {
  const expires = Date.now() + expiresIn * 1000
  const token = generateSignedToken(fileId, expires)

  return `/api/files/${fileId}/download?token=${token}&expires=${expires}`
}

// Generate a signed token for URL validation
function generateSignedToken(fileId: string, expires: number): string {
  const secret = process.env.FILE_SIGNING_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('FILE_SIGNING_SECRET or AUTH_SECRET must be set')
  }
  const data = `${fileId}:${expires}`

  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
}

// Validate a signed download URL
export function validateDownloadToken(
  fileId: string,
  token: string,
  expires: string
): boolean {
  const expiresNum = parseInt(expires, 10)

  // Check if expired
  if (Date.now() > expiresNum) {
    return false
  }

  // Validate token
  const expectedToken = generateSignedToken(fileId, expiresNum)
  return token === expectedToken
}

// List files for a project
export async function listProjectFiles(projectId: string) {
  return prisma.file_assets.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
}
