# Field Notes Setup Guide

## Overview

Field Notes is now integrated as a working archive powered by Notion. This guide will help you connect your Notion database to the site.

## Step 1: Create a Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name it: "scottbertrand.com Field Notes"
4. Select your workspace
5. Under "Capabilities", ensure "Read content" is enabled
6. Click "Submit"
7. Copy the "Internal Integration Token" (starts with `secret_`)

## Step 2: Share Your Database with the Integration

1. Open your Field Notes database in Notion: https://www.notion.so/2ed87253fff18013981fef46f830262e
2. Click the "•••" menu in the top right
3. Scroll down and click "Add connections"
4. Search for your integration name ("scottbertrand.com Field Notes")
5. Click to connect it

**Note:** To get the database ID, open the database in full-page view (click the expand icon), then copy the ID from the URL before the query parameters.

## Step 3: Configure Environment Variables

### For Local Development:

Create a `.env.local` file in the project root:

```bash
NOTION_API_KEY=your_secret_token_here
NOTION_DATABASE_ID=2ed87253fff18013981fef46f830262e
```

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add two variables:
   - `NOTION_API_KEY` = your integration secret
   - `NOTION_DATABASE_ID` = `2ed87253fff18013981fef46f830262e`
4. Select "Production", "Preview", and "Development" for both
5. Click "Save"
6. Redeploy your site

## Step 4: Test the Integration

Run locally:
```bash
npm run dev
```

Visit: http://localhost:8000/field-notes.html

You should see entries from your Notion database automatically populated.

## Notion Database Structure

The integration expects these properties in your Notion database:

### Required:
- **Title** (title) - Entry name
- **Published** (checkbox) - Controls visibility on the public site
  - ✓ Checked = Entry appears on site
  - ☐ Unchecked = Entry hidden from public
- **Type** (select) - Entry classification
  - Design exploration
  - Concept study
  - System sketch
  - Framework
  - Quote
  - Essay / Note
- **Status** (select) - Current state
  - In progress
  - Working
  - Archived
- **Created** (date) - When created

### Optional:
- **Focus** (multi-select) - Topics/themes
  - Brand systems, Typography, Layout, Interaction, Strategy, Editorial
- **Last revisited** (date) - When last updated

### Content:
- Page content (blocks) will be automatically rendered

## How It Works

1. `/api/field-notes.js` - Fetches list of published entries from Notion
2. `/api/field-notes/[id].js` - Fetches individual entry content with full Notion blocks
3. `field-notes.html` - Archive index showing all published entries
4. `field-note.html` - Dynamic template for individual entry pages
5. `/field-notes/:id` URLs are rewritten to `field-note.html` via Vercel config
6. Entries are cached for 5 minutes for performance

## Notes

- Only entries with **Published** checkbox checked will appear on the site
- Entries are sorted by "Last revisited" then "Created" date (most recent first)
- The system respects Notion's block types and renders them appropriately:
  - Paragraphs, headings (H1-H3), bulleted/numbered lists
  - Blockquotes, code blocks, images with captions, dividers
  - Rich text formatting (bold, italic, inline code, links)
- Changes in Notion appear on the site within 5 minutes (cache duration)
- Individual entry pages use dynamic routing: `/field-notes/[notion-page-id]`

## Troubleshooting

**Entries not showing:**
- Verify the **Published** checkbox is checked for the entries
- Verify the integration is connected to the database
- Ensure environment variables are set correctly (check database ID is the full-page view ID)
- Check Vercel logs for API errors
- Wait 5 minutes for cache to clear after making changes in Notion

**Individual entries not loading:**
- Verify the page ID in the URL matches Notion
- Check browser console for errors
- Ensure the integration has "Read content" permission
- Verify the entry is published (Published checkbox checked)

**Getting database ID errors:**
- Make sure you're using the database ID from the full-page view, not the inline view
- The database ID should be 32 characters without dashes (e.g., `2ed87253fff18013981fef46f830262e`)
- Navigate to the database, click the expand icon to open full-page view, copy ID from URL
