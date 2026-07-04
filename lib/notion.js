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

// Template/reference pages that should never appear as real destinations.
// Filtered by name rather than page ID, since ID-based exclusion proved
// unreliable (possibly due to the live environment reading a different
// copy/duplicate of the database than the one edited directly in Notion).
const EXCLUDED_NAME_PATTERNS = [
  /^country profile$/i,
  /^state profile$/i,
  /^us state profile$/i,
  /template/i,
];

function isExcludedDestination(name) {
  const n = (name || '').trim();
  if (!n) return true; // no name at all is never a real destination
  return EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(n));
}

/** Convenience: countries + states in one list, or null if Notion isn't configured yet. */
export async function getAllDestinations() {
  const [countries, states] = await Promise.all([getCountries(), getStates()]);
  if (!countries && !states) return null;
  const merged = [...(countries || []), ...(states || [])];

  console.log('[notion.js] DIAGNOSTIC: raw names before exclusion filter:', JSON.stringify(merged.map((d) => d.name)));

  const filtered = merged.filter((d) => !isExcludedDestination(d.name));

  console.log('[notion.js] DIAGNOSTIC: count before filter:', merged.length, '-> count after filter:', filtered.length);
  console.log('[notion.js] DIAGNOSTIC: names removed by filter:', JSON.stringify(merged.filter((d) => isExcludedDestination(d.name)).map((d) => d.name)));

  return filtered;
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
 * Countries + states, published only (Status: Done). This is the list
 * that should be used anywhere the site displays destinations to visitors
 * (destinations list, detail lookups, compare page). getAllDestinations()
 * itself stays unfiltered by status since the calculator uses it for budget
 * defaults regardless of publish status.
 */
export async function getPublishedDestinations() {
  const all = await getAllDestinations();
  if (!all) return null;
  return all.filter((d) => (d.status || '').trim().toLowerCase() === 'done');
}

/**
 * Find a single destination (country or state) by its URL slug, across
 * both databases. Only returns published profiles (Status: Done) — template
 * rows and in-progress drafts are excluded so they're not reachable by URL.
 * Returns null if not found or Notion isn't configured.
 */
export async function getDestinationBySlug(slug) {
  const published = await getPublishedDestinations();
  if (!published) return null;
  return published.find((d) => d.slug === slug) || null;
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

/**
 * Fetches a "hub" page (like the Slow Travel or Tax-Residency Rotation
 * overview pages) and separates its narrative content (intro text, purpose,
 * framing) from its list of linked sub-pages (child_page blocks). Each topic
 * includes its page ID and a slug so sub-pages can be linked to and looked
 * up individually. Returns { title, html, topics: [{ id, title, slug }] }.
 * Returns null if unconfigured or not found.
 */
export async function getGuideHub(pageId) {
  const client = getClient();
  if (!client || !pageId) return null;

  try {
    const page = await client.pages.retrieve({ page_id: pageId });
    const title = page.properties?.title?.title?.map((t) => t.plain_text).join('') || '';

    const blocks = await getBlockChildren(client, pageId);
    const topics = [];
    const contentBlocks = [];

    for (const block of blocks) {
      if (block.type === 'child_page') {
        const topicTitle = block.child_page?.title || 'Untitled';
        topics.push({ id: block.id, title: topicTitle, slug: slugify(topicTitle) });
      } else if (block.type === 'child_database') {
        // Linked databases (e.g. "Slow Travel Destinations") aren't rendered
        // in this minimal version — skip rather than showing raw block noise.
        continue;
      } else {
        contentBlocks.push(block);
      }
    }

    const html = await renderBlocksToHtml(client, contentBlocks);
    return { title, html, topics };
  } catch (err) {
    console.error('[notion.js] Guide hub fetch failed:', err.message || err);
    return null;
  }
}

/**
 * Fetches a single guide sub-page (e.g. "What Is Slow Travel?") by looking
 * it up within its parent hub's topic list by slug, then rendering its full
 * content. Returns { title, html } or null if not found/unconfigured.
 */
export async function getGuideSubPageBySlug(hubId, slug) {
  const hub = await getGuideHub(hubId);
  if (!hub) return null;

  const topic = hub.topics.find((t) => t.slug === slug);
  if (!topic) return null;

  const html = await getPageContentHtml(topic.id);
  return { title: topic.title, html };
}
