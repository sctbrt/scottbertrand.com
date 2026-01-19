// Vercel Serverless Function to fetch Field Notes from Notion
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    // Fetch entries from Notion database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true, // Only show published entries
        },
      },
      sorts: [
        {
          property: 'Last revisited',
          direction: 'descending',
        },
        {
          property: 'Created',
          direction: 'descending',
        },
      ],
    });

    // Transform Notion data into clean format
    const entries = response.results.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        title: props.Title?.title[0]?.plain_text || 'Untitled',
        type: props.Type?.select?.name || null,
        focus: props.Focus?.multi_select?.map(f => f.name) || [],
        status: props.Status?.select?.name || 'Working',
        created: props.Created?.date?.start || page.created_time,
        revisited: props['Last revisited']?.date?.start || null,
        url: `/field-notes/${page.id}`,
      };
    });

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).json({
      entries,
      count: entries.length,
    });

  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch entries',
      message: error.message,
    });
  }
}
