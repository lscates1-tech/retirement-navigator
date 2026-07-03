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
  if (prop.type === 'date') return prop.date?.start || '';
  return '';
}

export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapDestination(page, type) {
  const p = page.properties;
  const name = text(p['Country'] || p['Name']);
  return {
    id: page.id,
    type, // 'country' | 'state'
    name,
    slug: slugify(name),
    status: text(p['Status']),

    // Shared / cost & tax
    costOfLivingVsUS: text(p['Cost of Living vs US']),
    taxSystem: text(p['Tax System']),
    residencyPath: text(p['Residency Path']),
    healthcareCostNote: text(p['Healthcare Cost Note']),
    currency: text(p['Currency']),
    schengenMember: text(p['Schengen Member']),
    region: text(p['Region']),
    costLevel: text(p['Cost Level']),

    // Country-specific: visa fields
    visaName: text(p['Visa Name']),
    visaIncomeThreshold: text(p['Visa Income Threshold']),
    visaDuration: text(p['Visa Duration']),
    visaTaxTreatment: text(p['Visa Tax Treatment']),
    visaDifficulty: text(p['Visa Difficulty']),
    visaNotes2026: text(p['Visa Notes 2026']),
    visaLastVerified: text(p['Visa Last Verified']),

    // State-specific: tax & Medicare fields
    noIncomeTax: text(p['No Income Tax']),
    stateIncomeTax: text(p['State Income Tax']),
    propertyTaxLevel: text(p['Property Tax Level']),
    retirementIncomeTaxTreatment: text(p['Retirement Income Tax Treatment']),
    ssTaxTreatment: text(p['SS Tax Treatment']),
    medicareAdvantageMarket: text(p['Medicare Advantage Market']),
    keySeniorBenefits: text(p['Key Senior Benefits']),
    medicareNotes2026: text(p['Medicare Notes 2026']),
    healthcareHighlight: text(p['Healthcare Highlight']),
    bestFitTravelRegion: text(p['Best-Fit Travel Region']),
    domicileAuditRisk: text(p['Domicile Audit Risk']),
    lightFootprintDomicileFeasible: text(p['Light-Footprint Domicile Feasible']),
    majorGatewayAirports: text(p['Major International Gateway Airports']),
    hurricanePropertyInsuranceFlag: text(p['Hurricane/Property Insurance Flag']),

    // Homepage curation
    featured: Boolean(text(p['Featured'])),
    featuredRank: text(p['Featured Rank']),
    homepageTeaser: text(p['Homepage Teaser']),
    photoId: text(p['Photo ID']),

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
    return res.results.map((page) => mapDestination(page, 'country'));
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
    return res.results.map((page) => mapDestination(page, 'state'));
  } catch (err) {
    console.error('[notion.js] Notion states fetch failed:', err.message || err);
    return null;
  }
}

// Template/reference pages that should never appear as real destinations,
// regardless of what Notion's database membership currently reports. This
// exists as a backstop in case a page move out of a database hasn't fully
// propagated on Notion's side yet — belt-and-suspenders alongside the
// Status: Done filter used on the destinations list/detail pages.
const EXCLUDED_PAGE_IDS = new Set([
  '372995f1-23d7-80b7-866c-e42c423b4e6c', // "Country Profile" template
]);

/** Convenience: countries + states in one list, or null if Notion isn't configured yet. */
export async function getAllDestinations() {
  const [countries, states] = await Promise.all([getCountries(), getStates()]);
  if (!countries && !states) return null;
  return [...(countries || []), ...(states || [])].filter((d) => !EXCLUDED_PAGE_IDS.has(d.id));
}

/**
 * Featured homepage destinations: countries + states where Featured = true,
 * merged into one list and sorted by Featured Rank ascending. Returns null
 * if Notion isn't configured or both fetches fail, so callers can fall
 * back to a hardcoded emergency list.
 */
export async function getFeaturedDestinations() {
  const all = await getAllDestinations();
  if (!all) return null;

  const merged = all.filter((d) => d.featured);
  merged.sort((a, b) => (Number(a.featuredRank) || 999) - (Number(b.featuredRank) || 999));
  return merged;
}

/**
 * Find a single destination (country or state) by its URL slug, across
 * both databases. Only returns published profiles (Status: Done) — template
 * rows and in-progress drafts are excluded so they're not reachable by URL.
 * Returns null if not found or Notion isn't configured.
 */
export async function getDestinationBySlug(slug) {
  const all = await getAllDestinations();
  if (!all) return null;
  return all.find((d) => d.slug === slug && (d.status || '').trim().toLowerCase() === 'done') || null;
}

// ---------------------------------------------------------------------------
// Page content (the narrative sections written in each Notion page's body —
// Overview, Cost of Living, Healthcare, etc.) rendered to simple HTML.
// ---------------------------------------------------------------------------

function richTextToHtml(richTextArray) {
  if (!richTextArray || !richTextArray.length) return '';
  return richTextArray
    .map((rt) => {
      let s = (rt.plain_text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (rt.annotations?.code) s = `<code>${s}</code>`;
      if (rt.annotations?.bold) s = `<strong>${s}</strong>`;
      if (rt.annotations?.italic) s = `<em>${s}</em>`;
      if (rt.href) s = `<a href="${rt.href}" target="_blank" rel="noreferrer">${s}</a>`;
      return s;
    })
    .join('');
}

async function getBlockChildren(client, blockId) {
  const children = [];
  let cursor;
  do {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    children.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return children;
}

async function renderTable(client, block) {
  const rows = await getBlockChildren(client, block.id);
  const hasHeader = block.table?.has_column_header;
  const rowsHtml = rows
    .map((row, i) => {
      const cells = row.table_row?.cells || [];
      const tag = hasHeader && i === 0 ? 'th' : 'td';
      const cellsHtml = cells.map((cell) => `<${tag}>${richTextToHtml(cell)}</${tag}>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');
  return `<table>${rowsHtml}</table>`;
}

/**
 * Converts a flat list of Notion blocks into an HTML string, grouping
 * consecutive bulleted/numbered list items into proper <ul>/<ol> wrappers.
 */
async function renderBlocksToHtml(client, blocks) {
  let html = '';
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'

  const flushList = () => {
    if (listBuffer.length) {
      html += `<${listType}>${listBuffer.join('')}</${listType}>`;
      listBuffer = [];
      listType = null;
    }
  };

  for (const block of blocks) {
    const t = block.type;

    if (t === 'bulleted_list_item' || t === 'numbered_list_item') {
      const wantType = t === 'bulleted_list_item' ? 'ul' : 'ol';
      if (listType && listType !== wantType) flushList();
      listType = wantType;
      listBuffer.push(`<li>${richTextToHtml(block[t]?.rich_text)}</li>`);
      continue;
    }

    flushList();

    if (t === 'heading_1') {
      html += `<h2>${richTextToHtml(block.heading_1?.rich_text)}</h2>`;
    } else if (t === 'heading_2') {
      html += `<h3>${richTextToHtml(block.heading_2?.rich_text)}</h3>`;
    } else if (t === 'heading_3') {
      html += `<h4>${richTextToHtml(block.heading_3?.rich_text)}</h4>`;
    } else if (t === 'paragraph') {
      const inner = richTextToHtml(block.paragraph?.rich_text);
      if (inner.trim()) html += `<p>${inner}</p>`;
    } else if (t === 'quote') {
      html += `<blockquote>${richTextToHtml(block.quote?.rich_text)}</blockquote>`;
    } else if (t === 'divider') {
      html += `<hr />`;
    } else if (t === 'table') {
      html += await renderTable(client, block);
    } else if (t === 'callout') {
      const emoji = block.callout?.icon?.emoji || '';
      html += `<div class="callout">${emoji ? `<span>${emoji}</span> ` : ''}${richTextToHtml(block.callout?.rich_text)}</div>`;
    }
    // Silently skip block types we don't render yet (images, embeds, etc.)
  }

  flushList();
  return html;
}

/**
 * Fetches and renders the full body content of a Notion page (everything
 * below the properties — Overview, Cost of Living, Healthcare, etc.) as
 * an HTML string. Returns '' if Notion isn't configured or the fetch fails.
 */
export async function getPageContentHtml(pageId) {
  const client = getClient();
  if (!client || !pageId) return '';

  try {
    const blocks = await getBlockChildren(client, pageId);
    return await renderBlocksToHtml(client, blocks);
  } catch (err) {
    console.error('[notion.js] Page content fetch failed:', err.message || err);
    return '';
  }
}

/**
 * Convenience: full destination record (properties + rendered body content)
 * looked up by slug. Use this for the /destinations/[slug] detail page.
 */
export async function getDestinationDetailBySlug(slug) {
  const destination = await getDestinationBySlug(slug);
  if (!destination) return null;

  const contentHtml = await getPageContentHtml(destination.id);
  return { ...destination, contentHtml };
}
