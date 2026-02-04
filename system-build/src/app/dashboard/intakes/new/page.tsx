// Dashboard - Manual Intake Creation Page
// Used for creating intake records from AI phone calls (Beside App)
import Link from 'next/link'

export default function NewIntakePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/intakes"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-flex items-center gap-1"
        >
          ← Back to Intakes
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Manual Intake (Beside)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create an intake record from an AI phone call via Beside App
        </p>
      </div>

      <div className="glass p-6">
        <form className="space-y-6">
          {/* Client Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
              Client Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="contactName"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="+1 705 555 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="locationCity"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Sudbury"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="locationCountry"
                  defaultValue="Canada"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Beside Call Summary */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
              Beside Call Summary
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI Summary *
              </label>
              <textarea
                name="besideSummary"
                required
                rows={6}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Paste the Beside AI summary here..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Copy the summary from Beside App after the call
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transcript URL (optional)
              </label>
              <input
                type="url"
                name="besideTranscriptUrl"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="https://beside.app/transcript/..."
              />
            </div>
          </div>

          {/* Readiness Signals (Normalized from Beside) */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
              Readiness Signals
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
              Normalize the Beside conversation into structured fields
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Problem Clarity (1-5)
                </label>
                <select
                  name="problemClarity"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="1">1 - Very unclear</option>
                  <option value="2">2 - Somewhat unclear</option>
                  <option value="3">3 - Moderately clear</option>
                  <option value="4">4 - Fairly clear</option>
                  <option value="5">5 - Very clear</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Urgency
                </label>
                <select
                  name="urgency"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="NOW">Now</option>
                  <option value="ONE_TO_THREE_MONTHS">1-3 months</option>
                  <option value="LATER">Later</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Band
                </label>
                <select
                  name="budgetBand"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="UNDER_1K">Under $1,000</option>
                  <option value="ONE_TO_3K">$1,000 - $3,000</option>
                  <option value="THREE_TO_5K">$3,000 - $5,000</option>
                  <option value="FIVE_TO_10K">$5,000 - $10,000</option>
                  <option value="OVER_10K">Over $10,000</option>
                  <option value="NOT_SURE">Not sure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Decision Authority
                </label>
                <select
                  name="decisionAuthority"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="YES">Yes - sole decision maker</option>
                  <option value="SHARED">Shared decision</option>
                  <option value="NO">No - needs approval</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scope Type
                </label>
                <select
                  name="scopeType"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="WEB">Website only</option>
                  <option value="BRAND">Brand only</option>
                  <option value="BOTH">Both brand and website</option>
                  <option value="UNSURE">Unsure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Narrative (Optional) */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
              Narrative (Optional)
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What&apos;s not working? (max 500 chars)
              </label>
              <textarea
                name="whatsNotWorking"
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Summarize the core problem from the call..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Success looks like... (max 300 chars)
              </label>
              <textarea
                name="successLooksLike"
                maxLength={300}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="What outcome are they hoping for?"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/dashboard/intakes"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Create Intake (Pending Migration)
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Form submission disabled until database migration is run
          </p>
        </form>
      </div>
    </div>
  )
}
