// Vercel Serverless Function to fetch individual Field Notes entry
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Entry ID required' });
  }

  try {
    // Fetch page metadata
    const page = await notion.pages.retrieve({ page_id: id });

    // Fetch page content blocks
    const blocks = await notion.blocks.children.list({
      block_id: id,
      page_size: 100,
    });

    const props = page.properties;

    const entry = {
      id: page.id,
      title: props.Title?.title[0]?.plain_text || 'Untitled',
      type: props.Type?.select?.name || null,
      focus: props.Focus?.multi_select?.map(f => f.name) || [],
      status: props.Status?.select?.name || 'Working',
      created: props.Created?.date?.start || page.created_time,
      revisited: props['Last revisited']?.date?.start || null,
      blocks: blocks.results,
    };

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).json(entry);

  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch entry',
      message: error.message,
    });
  }
}
