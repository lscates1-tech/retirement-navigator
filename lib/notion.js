import { Client } from '@notionhq/client';

/**
 * This is the real fix for the "data sync" problem from earlier in the project:
 * this code runs on the SERVER (in a Server Component, API route, or build step),
 * so the Notion token never reaches the browser. Edit a row in Notion, and the
 * next time this function runs (on request, or on your revalidate schedule),
 * the live site reflects it — no manual copy-pasting between Notion and the site.
 *
 * Setup:
 *   1. Create an internal integration at https://www.notion.so/my-integrations
 *   2. Copy its "Internal Integration Secret"
 *   3. Add it to .env.local as NOTION_TOKEN=secret_xxx
 *   4. Share your Countries and US States databases with that integration
 *      (••• menu on the database → Connections → add your integration)
 *   5. Copy each database's ID from its URL and add to .env.local as
 *      NOTION_COUNTRIES_DB_ID and NOTION_STATES_DB_ID
 *
 * Until those env vars are set, the functions below return null and the
 * pages that use them should fall back to lib/destinationDefaults.js.
 */

function getClient() {
  const token = process.env.NOTION_TOKEN;
  console.log('[notion.js] NOTION_TOKEN present:', Boolean(token));
  if (!token) return null;
  return new Client({ auth: token });
}

function text(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title.map((t) => t.plain_text).join('');
  if (prop.type === 'rich_text') return prop.rich_text.map((t) => t.plain_text).join('');
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'status') return prop.status?.name || '';
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'checkbox') return prop.checkbox;
  return '';
}

function mapDestination(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: text(p['Country'] || p['Name']),
    status: text(p['Status']),
    costOfLivingVsUS: text(p['Cost of Living vs US']),
    taxSystem: text(p['Tax System']),
    residencyPath: text(p['Residency Path']),
    healthcareCostNote: text(p['Healthcare Cost Note']),
    visaIncomeThreshold: text(p['Visa Income Threshold']),
    currency: text(p['Currency']),
    schengenMember: text(p['Schengen Member']),
    budgetDefaults: {
      rent: text(p['Default Monthly Rent (1BR)']),
      own: text(p['Default Monthly Own Cost']),
      healthcare: text(p['Default Healthcare/Insurance']),
      transportation: text(p['Default Transportation']),
      groceries: text(p['Default Groceries']),
      utilities: text(p['Default Utilities']),
      phone: text(p['Default Phone/Internet']),
      dining: text(p['Default Dining/Entertainment']),
      misc: text(p['Default Misc']),
      confidence: text(p['Budget Defaults Confidence']),
    },
  };
}

export async function getCountries() {
  const client = getClient();
  const dbId = process.env.NOTION_COUNTRIES_DB_ID;
  console.log('[notion.js] NOTION_COUNTRIES_DB_ID present:', Boolean(dbId), 'value:', dbId);
  if (!client || !dbId) return null;

  try {
    const res = await client.databases.query({ database_id: dbId });
    console.log('[notion.js] Countries fetch succeeded, rows:', res.results.length);
    return res.results.map(mapDestination);
  } catch (err) {
    console.error('[notion.js] Notion countries fetch failed:', err.message || err);
    return null;
  }
}

export async function getStates() {
  const client = getClient();
  const dbId = process.env.NOTION_STATES_DB_ID;
  console.log('[notion.js] NOTION_STATES_DB_ID present:', Boolean(dbId), 'value:', dbId);
  if (!client || !dbId) return null;

  try {
    const res = await client.databases.query({ database_id: dbId });
    console.log('[notion.js] States fetch succeeded, rows:', res.results.length);
    return res.results.map(mapDestination);
  } catch (err) {
    console.error('[notion.js] Notion states fetch failed:', err.message || err);
    return null;
  }
}

/** Convenience: countries + states in one list, or null if Notion isn't configured yet. */
export async function getAllDestinations() {
  const [countries, states] = await Promise.all([getCountries(), getStates()]);
  if (!countries && !states) return null;
  return [...(countries || []), ...(states || [])];
}
