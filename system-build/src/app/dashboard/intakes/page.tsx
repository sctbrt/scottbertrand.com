// Dashboard - Intakes Management Page
// For reviewing intake submissions, routing decisions, and manual intake creation (Beside)
import Link from 'next/link'

export default async function IntakesPage() {
  // TODO: Implement after Prisma migration
  // - Fetch intake submissions
  // - Group by status (DRAFT, SUBMITTED, REVIEWED, ROUTED, CLOSED)
  // - Show pending intakes that need review

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Intakes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review intake submissions and manage routing decisions
          </p>
        </div>
        <Link
          href="/dashboard/intakes/new"
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
        >
          + Manual Intake (Beside)
        </Link>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard label="Submitted" count={0} status="SUBMITTED" />
        <StatusCard label="Needs Review" count={0} status="REVIEWED" highlight />
        <StatusCard label="Routed" count={0} status="ROUTED" />
        <StatusCard label="Closed" count={0} status="CLOSED" />
        <StatusCard label="Draft" count={0} status="DRAFT" />
      </div>

      {/* Empty State */}
      <div className="glass p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Intake System Ready
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Run the Prisma migration to enable the intake tracking system. Intakes
            from the website form and AI phone intake (Beside) will appear here.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            npx prisma migrate dev --name add-intake-system
          </p>
        </div>
      </div>

      {/* Intake Workflow Documentation */}
      <div className="glass p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Intake Workflow
        </h2>
        <div className="grid md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">1</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Intake Received</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 pl-8">
              From web form, AI phone (Beside), or manual entry
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-medium">2</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Review & Decide</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 pl-8">
              Set fit decision: YES / MAYBE / NO (required)
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">3</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Route</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 pl-8">
              Focus Studio Kickoff, Core Discovery, or Hold
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-medium">4</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Close</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 pl-8">
              Booking link sent or recommendation email delivered
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  label,
  count,
  status,
  highlight,
}: {
  label: string
  count: number
  status: string
  highlight?: boolean
}) {
  return (
    <Link
      href={`/dashboard/intakes?status=${status}`}
      className={`glass p-4 rounded-lg transition-all hover:scale-[1.02] ${
        highlight && count > 0
          ? 'border-amber-500/30 bg-amber-500/5'
          : ''
      }`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${
        highlight && count > 0
          ? 'text-amber-400'
          : 'text-gray-900 dark:text-gray-100'
      }`}>
        {count}
      </p>
    </Link>
  )
}
