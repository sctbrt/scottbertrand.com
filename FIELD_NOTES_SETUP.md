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

1. Open your Field Notes database in Notion: https://lilac-stocking-b2d.notion.site/2ea3c4a766e480b7a46ed6bb8d6cde82
2. Click the "•••" menu in the top right
3. Scroll down and click "Add connections"
4. Search for your integration name ("scottbertrand.com Field Notes")
5. Click to connect it

## Step 3: Configure Environment Variables

### For Local Development:

Create a `.env.local` file in the project root:

```bash
NOTION_API_KEY=your_secret_token_here
NOTION_DATABASE_ID=2ea3c4a766e480b7a46ed6bb8d6cde82
```

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add two variables:
   - `NOTION_API_KEY` = your integration secret
   - `NOTION_DATABASE_ID` = `2ea3c4a766e480b7a46ed6bb8d6cde82`
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
- **Type** (select) - Entry classification
  - Design exploration
  - Concept study
  - System sketch
  - Framework
  - Essay / Note
- **Status** (select) - Current state
  - In progress
  - Working
  - Archived (won't display on site)
- **Created** (date) - When created

### Optional:
- **Focus** (multi-select) - Topics/themes
  - Brand systems, Typography, Layout, Interaction, Strategy, Editorial
- **Last revisited** (date) - When last updated

### Content:
- Page content (blocks) will be automatically rendered

## How It Works

1. `/api/field-notes.js` - Fetches list of entries from Notion
2. `/api/field-notes/[id].js` - Fetches individual entry content
3. `field-notes.html` - Archive index showing all entries
4. Entries are cached for 5 minutes for performance

## Notes

- Archived entries won't appear on the site
- Entries are sorted by "Last revisited" then "Created" date
- The system respects Notion's block types and renders them appropriately
- Changes in Notion appear on the site within 5 minutes (cache duration)

## Troubleshooting

**Entries not showing:**
- Verify the integration is connected to the database
- Check that entries aren't marked as "Archived"
- Ensure environment variables are set correctly
- Check Vercel logs for API errors

**Individual entries not loading:**
- Verify the page ID in the URL matches Notion
- Check browser console for errors
- Ensure the integration has "Read content" permission
