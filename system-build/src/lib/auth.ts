// BERTRANDBRANDS.COM — Auth.js Configuration
// Magic-link authentication with Resend email provider

import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { prisma } from './prisma'
import type { Role } from '@prisma/client'
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters'

// Custom adapter for lowercase Prisma model names
function CustomPrismaAdapter(): Adapter {
  return {
    async createUser(data) {
      const user = await prisma.users.create({
        data: {
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
          role: 'CLIENT', // Default role for new users
        },
      })
      return { ...user, role: user.role } as AdapterUser & { role: Role }
    },

    async getUser(id) {
      const user = await prisma.users.findUnique({ where: { id } })
      if (!user) return null
      return { ...user, role: user.role } as AdapterUser & { role: Role }
    },

    async getUserByEmail(email) {
      const user = await prisma.users.findUnique({ where: { email } })
      if (!user) return null
      return { ...user, role: user.role } as AdapterUser & { role: Role }
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.accounts.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { users: true },
      })
      if (!account?.users) return null
      return { ...account.users, role: account.users.role } as AdapterUser & { role: Role }
    },

    async updateUser(data) {
      const user = await prisma.users.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          image: data.image,
          emailVerified: data.emailVerified,
        },
      })
      return { ...user, role: user.role } as AdapterUser & { role: Role }
    },

    async deleteUser(userId) {
      await prisma.users.delete({ where: { id: userId } })
    },

    async linkAccount(data) {
      await prisma.accounts.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: data.expires_at,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: data.session_state,
        },
      })
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await prisma.accounts.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      })
    },

    async createSession(data) {
      const session = await prisma.sessions.create({
        data: {
          userId: data.userId,
          sessionToken: data.sessionToken,
          expires: data.expires,
        },
      })
      return session as AdapterSession
    },

    async getSessionAndUser(sessionToken) {
      const session = await prisma.sessions.findUnique({
        where: { sessionToken },
        include: { users: true },
      })
      if (!session?.users) return null
      return {
        session: session as AdapterSession,
        user: { ...session.users, role: session.users.role } as AdapterUser & { role: Role },
      }
    },

    async updateSession(data) {
      const session = await prisma.sessions.update({
        where: { sessionToken: data.sessionToken },
        data: { expires: data.expires },
      })
      return session as AdapterSession
    },

    async deleteSession(sessionToken) {
      await prisma.sessions.delete({ where: { sessionToken } })
    },

    async createVerificationToken(data) {
      const token = await prisma.verification_tokens.create({
        data: {
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        },
      })
      return token as VerificationToken
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await prisma.verification_tokens.delete({
          where: { identifier_token: { identifier, token } },
        })
        return verificationToken as VerificationToken
      } catch {
        return null
      }
    },
  }
}

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: Role
      image?: string | null
    }
  }

  interface User {
    role: Role
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: CustomPrismaAdapter(),

  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
      from: 'Bertrand Brands <hello@bertrandbrands.com>',
      // Custom magic link email
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log('[Auth] sendVerificationRequest called for:', identifier)
        console.log('[Auth] Magic link URL:', url)

        const { Resend: ResendClient } = await import('resend')
        const resend = new ResendClient(process.env.RESEND_API_KEY)

        console.log('[Auth] Sending email via Resend...')
        const result = await resend.emails.send({
          from: provider.from!,
          to: identifier,
          subject: 'Sign in to Bertrand Brands',
          html: magicLinkEmailHtml(url),
          text: magicLinkEmailText(url),
        })

        console.log('[Auth] Resend result:', JSON.stringify(result))

        if (result.error) {
          console.error('[Auth] Resend error:', result.error)
          throw new Error(`Failed to send verification email: ${result.error.message}`)
        }

        console.log('[Auth] Email sent successfully, ID:', result.data?.id)
      },
    }),
  ],

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
    error: '/login/error',
  },

  callbacks: {
    async session({ session, user }) {
      // Add role to session
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    },

    async signIn({ user }) {
      // Log sign-in activity (only for existing users to avoid FK constraint errors)
      if (user.id) {
        try {
          // Verify user exists in database before logging
          const existingUser = await prisma.users.findUnique({
            where: { id: user.id },
            select: { id: true },
          })
          if (existingUser) {
            await prisma.activity_logs.create({
              data: {
                userId: user.id,
                action: 'SIGN_IN',
                entityType: 'User',
                entityId: user.id,
                details: {
                  method: 'magic-link',
                  timestamp: new Date().toISOString(),
                },
              },
            })
          }
        } catch (error) {
          // Don't block sign-in if activity logging fails
          console.error('Failed to log sign-in activity:', error)
        }
      }
      return true
    },
  },

  events: {
    async linkAccount({ user }) {
      // Mark email as verified when account is linked
      await prisma.users.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
    },
  },

  // Security settings per spec
  trustHost: true,
  debug: true, // Temporarily enabled for debugging

  // Add logger for debugging
  logger: {
    error(code, ...message) {
      console.error('[Auth Error]', code, ...message)
    },
    warn(code, ...message) {
      console.warn('[Auth Warn]', code, ...message)
    },
    debug(code, ...message) {
      console.log('[Auth Debug]', code, ...message)
    },
  },
})

// Magic link email templates
function magicLinkEmailHtml(url: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Scott Bertrand</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f3; margin: 0; padding: 40px 20px;">
  <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding: 40px;">
        <h1 style="font-size: 20px; font-weight: 500; color: #111111; margin: 0 0 24px 0;">
          Sign in to Bertrand Brands
        </h1>
        <p style="font-size: 15px; color: #404040; line-height: 1.6; margin: 0 0 24px 0;">
          Click the button below to sign in. This link expires in 15 minutes.
        </p>
        <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: 500;">
          Sign In
        </a>
        <p style="font-size: 13px; color: #6b6b6b; line-height: 1.5; margin: 24px 0 0 0;">
          If you didn't request this email, you can safely ignore it.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 24px 0;">
        <p style="font-size: 12px; color: #8a8a8a; margin: 0;">
          Bertrand Brands — Brand & Web Systems
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

function magicLinkEmailText(url: string): string {
  return `
Sign in to Bertrand Brands

Click the link below to sign in. This link expires in 15 minutes.

${url}

If you didn't request this email, you can safely ignore it.

---
Bertrand Brands — Brand & Web Systems
`
}
