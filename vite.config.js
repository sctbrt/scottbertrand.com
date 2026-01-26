import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { imagetools } from 'vite-imagetools'

// Custom plugin to handle /api/field-notes locally
function notionApiPlugin() {
  return {
    name: 'notion-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/field-notes') {
          const env = loadEnv('development', process.cwd(), '')
          const NOTION_API_KEY = env.NOTION_API_KEY
          const DATABASE_ID = env.NOTION_DATABASE_ID

          if (!NOTION_API_KEY || !DATABASE_ID) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing Notion credentials in .env.local' }))
            return
          }

          try {
            const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filter: { property: 'Published', checkbox: { equals: true } },
                sorts: [
                  { property: 'Last revisited', direction: 'descending' },
                  { property: 'Created', direction: 'descending' },
                ],
              }),
            })

            const data = await response.json()

            const extractFileUrl = (filesProp) => {
              if (!filesProp?.files || filesProp.files.length === 0) return null
              const firstFile = filesProp.files[0]
              if (firstFile.type === 'file') return firstFile.file.url
              if (firstFile.type === 'external') return firstFile.external.url
              return null
            }

            const entries = data.results.map((page) => {
              const props = page.properties
              return {
                id: page.id,
                title: props.Title?.title[0]?.plain_text || 'Untitled',
                type: props.Type?.select?.name || null,
                focus: props.Focus?.multi_select?.map(f => f.name) || [],
                status: props.Status?.select?.name || 'Working',
                created: props.Created?.date?.start || page.created_time,
                revisited: props['Last revisited']?.date?.start || null,
                media: extractFileUrl(props.Image) || extractFileUrl(props.Media),
                url: `/field-notes/${page.id}`,
              }
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ entries, count: entries.length }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
          return
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [imagetools(), notionApiPlugin()],
  root: 'src/pages',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/pages/index.html'),
        about: resolve(__dirname, 'src/pages/about.html'),
        approach: resolve(__dirname, 'src/pages/approach.html'),
        focus: resolve(__dirname, 'src/pages/focus.html'),
        contact: resolve(__dirname, 'src/pages/contact.html'),
        fieldNotes: resolve(__dirname, 'src/pages/field-notes.html'),
        fieldNote: resolve(__dirname, 'src/pages/field-note.html'),
        // V1.2.0 pages
        howItWorks: resolve(__dirname, 'src/pages/how-it-works.html'),
        request: resolve(__dirname, 'src/pages/request.html'),
        // Entry-level service pages
        microConsult: resolve(__dirname, 'src/pages/services/micro-consult.html'),
        websiteSnapshot: resolve(__dirname, 'src/pages/services/website-snapshot.html'),
        brandClarity: resolve(__dirname, 'src/pages/services/brand-clarity.html'),
        // Strategic review pages
        strategicWebsiteReview: resolve(__dirname, 'src/pages/services/strategic-website-review.html'),
        strategicBrandReview: resolve(__dirname, 'src/pages/services/strategic-brand-review.html'),
        // Full system pages
        brandReset: resolve(__dirname, 'src/pages/services/brand-reset.html'),
        websiteFoundation: resolve(__dirname, 'src/pages/services/website-foundation.html'),
        brandWebsiteReset: resolve(__dirname, 'src/pages/services/brand-website-reset.html'),
        // Ongoing support pages
        asyncAdvisory: resolve(__dirname, 'src/pages/services/async-advisory.html'),
        phoneConsultation: resolve(__dirname, 'src/pages/services/phone-consultation.html'),
        // SEO / LLM-EO content pages
        whatIsBrandWebSystem: resolve(__dirname, 'src/pages/what-is-a-brand-web-system.html'),
        sudburyWebsiteLeads: resolve(__dirname, 'src/pages/sudbury-small-business-website-leads.html'),
        // Landing pages
        websiteSnapshotLanding: resolve(__dirname, 'src/pages/website-snapshot.html'),
        sudburyBrandWebsiteClarity: resolve(__dirname, 'src/pages/sudbury-brand-website-clarity.html'),
      },
    },
  },
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8000,
    open: true,
  },
})
