import { Client } from '@notionhq/client';

/**
 * Separate, minimal client for lead capture — deliberately not reusing
 * lib/notion.js's getClient(), since that file is scoped to read-only
 * destination fetching and this is a write path. Same NOTION_TOKEN env var
 * though; one integration, both read and write access.
 */
function getClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

function truncate(value, max = 2000) {
  // Notion rich_text blocks have a hard 2000-character limit per block.
  return (value || '').toString().slice(0, max);
}

/**
 * Saves one lead (email + their quiz answers + the recommendation they were
 * shown) as a page in the Recommend Tool Leads database. Throws if Notion
 * isn't configured or the write fails — callers should catch this and
 * degrade gracefully rather than crash the page.
 */
export async function saveLead({ email, climate, budget, visaPriority, notes, recommendation, destinations }) {
  const client = getClient();
  const dbId = process.env.NOTION_LEADS_DB_ID;
  if (!client || !dbId) {
    throw new Error('Notion not configured for lead capture (NOTION_TOKEN or NOTION_LEADS_DB_ID missing).');
  }

  await client.pages.create({
    parent: { database_id: dbId },
    properties: {
      Email: { title: [{ text: { content: truncate(email, 200) } }] },
      Climate: { select: { name: climate } },
      Budget: { select: { name: budget } },
      'Visa Priority': { select: { name: visaPriority } },
      Notes: { rich_text: [{ text: { content: truncate(notes) } }] },
      Recommendation: { rich_text: [{ text: { content: truncate(recommendation) } }] },
      'Also Considered': { rich_text: [{ text: { content: truncate(destinations) } }] },
    },
  });
}
