'use client'

// Client Filter Select - Client Component for interactive filtering
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  companyName: string | null
  contactName: string
}

interface ClientFilterSelectProps {
  clients: Client[]
  currentClientId?: string
  currentStatus?: string
}

export function ClientFilterSelect({
  clients,
  currentClientId,
  currentStatus,
}: ClientFilterSelectProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams()
    if (currentStatus) params.set('status', currentStatus)
    if (e.target.value) params.set('clientId', e.target.value)
    const query = params.toString()
    router.push(`/dashboard/projects${query ? `?${query}` : ''}`)
  }

  return (
    <select
      defaultValue={currentClientId || ''}
      onChange={handleChange}
      aria-label="Filter by client"
      className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)]"
    >
      <option value="">All Clients</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.companyName || client.contactName}
        </option>
      ))}
    </select>
  )
}
