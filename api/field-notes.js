// Vercel Serverless Function to fetch Field Notes from Notion
export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  // Add validation
  if (!NOTION_API_KEY) {
    return res.status(500).json({
      error: 'Missing NOTION_API_KEY environment variable',
    });
  }

  if (!DATABASE_ID) {
    return res.status(500).json({
      error: 'Missing NOTION_DATABASE_ID environment variable',
    });
  }

  try {
    // Fetch entries from Notion database using REST API directly
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Published',
          checkbox: {
            equals: true,
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Notion API request failed');
    }

    const data = await response.json();

    // Transform Notion data into clean format
    const entries = data.results.map((page) => {
      const props = page.properties;

      // Helper to extract file URL from a files property
      const extractFileUrl = (filesProp) => {
        if (!filesProp?.files || filesProp.files.length === 0) return null;
        const firstFile = filesProp.files[0];
        if (firstFile.type === 'file') {
          return firstFile.file.url;
        } else if (firstFile.type === 'external') {
          return firstFile.external.url;
        }
        return null;
      };

      // Extract media - check Image first, then Media property
      const media = extractFileUrl(props.Image) || extractFileUrl(props.Media);

      return {
        id: page.id,
        title: props.Title?.title[0]?.plain_text || 'Untitled',
        type: props.Type?.select?.name || null,
        focus: props.Focus?.multi_select?.map(f => f.name) || [],
        status: props.Status?.select?.name || 'Working',
        created: props.Created?.date?.start || page.created_time,
        revisited: props['Last revisited']?.date?.start || null,
        media: media,
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
