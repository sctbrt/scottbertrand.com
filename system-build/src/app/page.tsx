// Root page — redirects authenticated users to their dashboard/portal
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    if (session.user.role === 'CLIENT') {
      redirect('/portal')
    }
    redirect('/dashboard')
  }

  // Not authenticated — send to login
  redirect('/login')
}
