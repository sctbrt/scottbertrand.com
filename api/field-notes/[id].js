// Vercel Serverless Function to fetch individual Field Notes entry
export default async function handler(req, res) {
  const { id } = req.query;
  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  // Validate
  if (!NOTION_API_KEY) {
    return res.status(500).json({
      error: 'Missing NOTION_API_KEY environment variable',
    });
  }

  if (!id) {
    return res.status(400).json({ error: 'Entry ID required' });
  }

  try {
    // Fetch page metadata
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!pageResponse.ok) {
      const errorData = await pageResponse.json();
      throw new Error(errorData.message || 'Failed to fetch page');
    }

    const page = await pageResponse.json();

    // Fetch page content blocks
    const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!blocksResponse.ok) {
      const errorData = await blocksResponse.json();
      throw new Error(errorData.message || 'Failed to fetch blocks');
    }

    const blocks = await blocksResponse.json();

    // Transform page data
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
