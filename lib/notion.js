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

// Notion returns relation-type properties as an array of { id } objects
// pointing at related pages. text() has no case for this (it's not a
// display value), so relation properties need their own accessor.
function relationIds(prop) {
  if (!prop || prop.type !== 'relation') return [];
  return prop.relation.map((r) => r.id);
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

// Maps every known guide hub/sub-page Notion ID to its live site path, so
// internal "Where to Go Next" links inside guide content point visitors to
// the real site page instead of taking them off-site into Notion. IDs are
// stored normalized (lowercase, no dashes).
const GUIDE_PAGE_ID_TO_PATH = new Map([
  ['388995f123d78100a8b0fea7aaf788a0', '/guides'], // Slow Travel hub
  ['388995f123d781f28429c9103ee847b2', '/guides'], // Tax-Residency Rotation hub
  ['0ac98c3f9f6d4046a05935c1e9753d2a', '/guides/slow-travel/destinations'], // Slow Travel Destinations DB
  ['c8651d01d630412a8c3aa8aed232b8b3', '/guides/tax-residency-rotation/thresholds'], // Country Tax-Residency Thresholds DB
  // National Tax Strategies hub + sub-pages
  ['393995f123d781ec828af6abdf4ab78b', '/guides'],
  ['393995f123d7816ba13ede6b7759a60d', '/guides/national-tax-strategies/roth-conversion-ladders-in-early-retirement'],
  ['393995f123d78172afbdd2dcd30c481a', '/guides/national-tax-strategies/qualified-charitable-distributions-qcds'],
  ['393995f123d78101867bc6d503a87190', '/guides/national-tax-strategies/social-security-claiming-age-strategy'],
  ['393995f123d781478467d460fe3b47a5', '/guides/national-tax-strategies/tax-efficient-withdrawal-order'],
  ['393995f123d7814bbf68d2828ef36753', '/guides/national-tax-strategies/irmaa-avoiding-medicare-premium-surcharges'],
  ['393995f123d78146addfceb74e4b0f59', '/guides/national-tax-strategies/health-savings-accounts-before-medicare'],
  ['393995f123d78151be2ee795eab631e3', '/guides/national-tax-strategies/foreign-tax-credit-vs-foreign-earned-income-exclusion'],
  ['393995f123d78197b078e142a0f0eb45', '/guides/national-tax-strategies/tax-loss-harvesting-in-retirement'],
  ['393995f123d7816888fee89f78eb3ddf', '/guides/national-tax-strategies/state-residency-timing-for-tax-purposes'],
  ['393995f123d7810fa705eeccb04d999f', '/guides/national-tax-strategies/estate-inheritance-tax-basics-for-retirees'],
  ['393995f123d781c9a441c2ecf07c20a1', '/guides/national-tax-strategies/required-minimum-distributions-rmds-rules-and-strategy'],
  // International Tax Strategies hub + country pages
  ['393995f123d781e3a7dce500ce25ce11', '/guides'],
  ['393995f123d781e0882cf4c4047a63d5', '/guides/international-tax-strategies/spain-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781bea086f2079dfc8cf1', '/guides/international-tax-strategies/portugal-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781e68ec1fcbe452099a4', '/guides/international-tax-strategies/panama-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781c587a2d0409e1db70a', '/guides/international-tax-strategies/costa-rica-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781daa91fea90fe2067b4', '/guides/international-tax-strategies/mexico-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781dc866af0a4608f1f54', '/guides/international-tax-strategies/thailand-roth-ira-and-retirement-account-treatment'],
  ['13692fc9e1654b339e0489c85152339b', '/guides/international-tax-strategies/treatment-by-country'], // Retirement Account Tax Treatment DB
  ['393995f123d7818e90bacdefae4a9147', '/guides/international-tax-strategies/italy-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781499985ce738613cef5', '/guides/international-tax-strategies/greece-roth-ira-and-retirement-account-treatment'],
  ['393995f123d78143a745f0e1713956c6', '/guides/international-tax-strategies/ecuador-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781ac9bf9ecac319f7765', '/guides/international-tax-strategies/france-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781ddbde5f6be49c3c705', '/guides/international-tax-strategies/argentina-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781f08641f307a3205b88', '/guides/international-tax-strategies/cyprus-roth-ira-and-retirement-account-treatment'],
  ['393995f123d78159b401fc88985079c6', '/guides/international-tax-strategies/malta-roth-ira-and-retirement-account-treatment'],
  ['393995f123d78171a47fdc979250072a', '/guides/international-tax-strategies/croatia-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781a8a365cfdfc68d8bf8', '/guides/international-tax-strategies/slovenia-roth-ira-and-retirement-account-treatment'],
  ['393995f123d781469118db6c93dc515e', '/guides/international-tax-strategies/philippines-roth-ira-and-retirement-account-treatment'],
  // Slow Travel sub-pages
  ['388995f123d781999bf6efe6ee91a8f1', '/guides/slow-travel/what-is-slow-travel'],
  ['388995f123d7814f8174f3d24043d9be', '/guides/slow-travel/why-slow-travel-before-retiring-abroad'],
  ['388995f123d7818da83ad9a2c33fc27e', '/guides/slow-travel/slow-travel-vs-moving-abroad'],
  ['388995f123d781c7b5b8c0afdd5194d9', '/guides/slow-travel/visa-and-stay-limits'],
  ['388995f123d781619887de43709f4d28', '/guides/slow-travel/schengen-slow-travel'],
  ['388995f123d781b88152f5ff7f6b7dae', '/guides/slow-travel/slow-travel-budgeting'],
  ['388995f123d78189860bfedf86594a7b', '/guides/slow-travel/housing-for-slow-travel'],
  ['388995f123d781709129e214e3355a9d', '/guides/slow-travel/healthcare-while-slow-traveling'],
  ['388995f123d7812b9d4bedab79363f28', '/guides/slow-travel/banking-money-and-payments'],
  ['388995f123d781a3a808d18b58fdb488', '/guides/slow-travel/transportation-and-walkability'],
  ['388995f123d7810599f6cda14b9ec12b', '/guides/slow-travel/safety-and-practical-risk'],
  ['388995f123d78190ba81e50ec13b9447', '/guides/slow-travel/best-slow-travel-destinations'],
  ['388995f123d7814596ecfb03f88a61f3', '/guides/slow-travel/slow-travel-checklist'],
  ['388995f123d78134bd42e07bf988a9fb', '/guides/slow-travel/sample-slow-travel-itineraries'],
  // Tax-Residency Rotation sub-pages
  ['388995f123d781e9830cc0374d016755', '/guides/tax-residency-rotation/what-this-strategy-actually-is-and-isn-t'],
  ['388995f123d7810480bbf2751687764c', '/guides/tax-residency-rotation/schengen-90-180-explained-properly'],
  ['388995f123d7819b98abe9f30985cd09', '/guides/tax-residency-rotation/beyond-schengen-country-by-country-residency-triggers'],
  ['388995f123d781f9925df7523bb7df0d', '/guides/tax-residency-rotation/cumulative-vs-consecutive-day-counting'],
  ['388995f123d781808669f915c497cdc4', '/guides/tax-residency-rotation/us-state-tax-residency-domicile'],
  ['388995f123d78136ae7ec0e8e8d2b960', '/guides/tax-residency-rotation/choosing-a-us-home-base-state'],
  ['388995f123d781829d14f31b422b056e', '/guides/tax-residency-rotation/the-legal-line-minimization-vs-evasion'],
  ['388995f123d78101b8abced55b5cdbce', '/guides/tax-residency-rotation/sample-rotation-circuits'],
  ['388995f123d781a4bac2cc135a13c16e', '/guides/tax-residency-rotation/documentation-and-proof-of-non-residency'],
  ['388995f123d781f9b701c22efd5bfe30', '/guides/tax-residency-rotation/risks-and-edge-cases'],
  ['393995f123d781d99020c8c3d96176f5', '/guides/tax-residency-rotation/protecting-roth-ira-and-retirement-accounts-while-rotating'],
  // Work From Anywhere hub + topics
  ['39b995f123d781c29a62c9b1d75e1c88', '/guides'],
  ['39b995f123d7813591fbe32453eaf374', '/guides/work-from-anywhere/state-tax-residency-while-working-remotely-abroad'],
  ['39b995f123d78102aaa1cb796b3f5392', '/guides/work-from-anywhere/remote-work-income-what-counts-and-to-whom'],
  ['39b995f123d7815690ccf5b1df131217', '/guides/work-from-anywhere/the-foreign-earned-income-exclusion-for-remote-workers'],
  ['39b995f123d78130b528d657a0486132', '/guides/work-from-anywhere/llc-sole-proprietor-or-employer-of-record'],
  ['39b995f123d781eda4d2f969be4c36dc', '/guides/work-from-anywhere/what-is-a-digital-nomad-visa'],
  ['39b995f123d781f0916ffabf31ba838c', '/guides/work-from-anywhere/health-insurance-for-remote-workers-abroad'],
  ['39b995f123d7819baf70f26e2ef9c5bb', '/guides/work-from-anywhere/choosing-a-base-vs-rotating-while-working-remotely'],
  ['39b995f123d781318955e184723fa31c', '/guides/work-from-anywhere/time-zone-strategy-for-u-s-clients-and-employers'],
  ['39b995f123d7819c9f5ef40dfbc29a5a', '/guides/work-from-anywhere/digital-nomad-visa-documentation-application-process'],
  ['39b995f123d7814d949ae70a852a74e7', '/guides/work-from-anywhere/common-remote-work-abroad-mistakes'],
  ['39b995f123d7817b9476c9225bb6560b', '/guides/work-from-anywhere/building-a-genuinely-location-independent-career'],
  ['589794984934457ab06755a264930d13', '/guides/work-from-anywhere/visa-comparison'], // Digital Nomad Visa Comparison DB
]);

function resolveGuideLink(href) {
  if (!href) return { href, keep: true };
  const isNotionUrl = /notion\.so|app\.notion\.com/i.test(href);
  if (!isNotionUrl) return { href, keep: true }; // external citation — leave untouched

  const match = href.match(/([0-9a-fA-F-]{32,36})(?:[/?#]|$)/);
  const normalized = match ? match[1].replace(/-/g, '').toLowerCase() : '';
  const mapped = GUIDE_PAGE_ID_TO_PATH.get(normalized);

  if (mapped) return { href: mapped, keep: true };
  // A Notion link we don't have a site page for yet (e.g. a linked database
  // that isn't built on-site) — don't send visitors off-site to a page they
  // likely can't even access. Render the text without a link instead.
  return { href: null, keep: false };
}

function richTextToHtml(richTextArray) {
  if (!richTextArray || !richTextArray.length) return '';
  return richTextArray
    .map((rt) => {
      let s = (rt.plain_text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (rt.annotations?.code) s = `<code>${s}</code>`;
      if (rt.annotations?.bold) s = `<strong>${s}</strong>`;
      if (rt.annotations?.italic) s = `<em>${s}</em>`;
      if (rt.href) {
        const resolved = resolveGuideLink(rt.href);
        if (resolved.keep) {
          const isInternal = resolved.href.startsWith('/');
          s = isInternal
            ? `<a href="${resolved.href}">${s}</a>`
            : `<a href="${resolved.href}" target="_blank" rel="noreferrer">${s}</a>`;
        }
        // else: link intentionally dropped, keep plain text (s unchanged)
      }
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

// ---------------------------------------------------------------------------
// Slow Travel Destinations & Country Tax-Residency Thresholds — the two
// databases linked from the Guides section, each with their own comparison
// table page.
// ---------------------------------------------------------------------------

const SLOW_TRAVEL_DESTINATIONS_DB_ID = '0ac98c3f-9f6d-4046-a059-35c1e9753d2a';
const TAX_RESIDENCY_THRESHOLDS_DB_ID = 'c8651d01-d630-412a-8c3a-a8aed232b8b3';
const RETIREMENT_ACCOUNT_TAX_TREATMENT_DB_ID = '13692fc9-e165-4b33-9e04-89c85152339b';
const DIGITAL_NOMAD_VISA_DB_ID = '58979498-4934-457a-b067-55a264930d13';
const CITIES_REGIONS_DB_ID = '2a762387-0a16-4db1-9684-15b2649c39f8';

/** Slow Travel Destinations, published only (Status: Done). */
export async function getSlowTravelDestinations() {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.databases.query({ database_id: SLOW_TRAVEL_DESTINATIONS_DB_ID });
    return res.results
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          destination: text(p['Destination']),
          country: text(p['Country']),
          status: text(p['Status']),
          bestFor: text(p['Best For']),
          bestMonths: text(p['Best Months to Visit']),
          cautions: text(p['Cautions']),
          englishSpoken: text(p['English Spoken']),
          estimatedBudget: text(p['Estimated Monthly Budget']),
          goodForFirstTimers: text(p['Good for First-Time Slow Travelers']),
          healthcareAccess: text(p['Healthcare Access']),
          safetyLevel: text(p['Safety Level']),
          schengen: text(p['Schengen?']),
          visaFreeLength: text(p['Visa-Free Stay Length']),
          walkability: text(p['Walkability']),
          sources: text(p['Sources']),
        };
      })
      .filter((d) => (d.status || '').trim().toLowerCase() === 'done');
  } catch (err) {
    console.error('[notion.js] Slow Travel Destinations fetch failed:', err.message || err);
    return null;
  }
}

/** Country Tax-Residency Thresholds, published only (Status: Done). */
export async function getTaxResidencyThresholds() {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.databases.query({ database_id: TAX_RESIDENCY_THRESHOLDS_DB_ID });
    return res.results
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          country: text(p['Country']),
          status: text(p['Status']),
          dayCountType: text(p['Day-Count Type']),
          thresholdDays: text(p['Threshold (Days)']),
          schengen: text(p['Schengen?']),
          riskLevel: text(p['Risk Level for Rotation Planning']),
          additionalTriggers: text(p['Additional Residency Triggers']),
          citizenshipBasedTax: text(p['Citizenship-Based Tax (Home Country)']),
          notes: text(p['Notes / Cautions']),
          sources: text(p['Sources']),
        };
      })
      .filter((d) => (d.status || '').trim().toLowerCase() === 'done');
  } catch (err) {
    console.error('[notion.js] Tax-Residency Thresholds fetch failed:', err.message || err);
    return null;
  }
}

/** Retirement Account Tax Treatment by Country, published only (Status: Done). */
export async function getRetirementAccountTaxTreatment() {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.databases.query({ database_id: RETIREMENT_ACCOUNT_TAX_TREATMENT_DB_ID });
    return res.results
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          country: text(p['Country']),
          status: text(p['Status']),
          rothTreatment: text(p['Roth IRA Treatment']),
          rothConfidence: text(p['Roth IRA Confidence']),
          traditionalTreatment: text(p['Traditional IRA / 401k / Pension Treatment']),
          traditionalConfidence: text(p['Traditional IRA Confidence']),
          socialSecurityTreatment: text(p['Social Security Treatment']),
          treatyStatus: text(p['US Tax Treaty Status']),
          wealthTaxExposure: text(p['Wealth Tax Exposure']),
          keyPlanningConsideration: text(p['Key Planning Consideration']),
          recommendedAdvisorType: text(p['Recommended Advisor Type']),
          sources: text(p['Sources']),
        };
      })
      .filter((d) => (d.status || '').trim().toLowerCase() === 'done');
  } catch (err) {
    console.error('[notion.js] Retirement Account Tax Treatment fetch failed:', err.message || err);
    return null;
  }
}

/** Digital Nomad Visa Comparison, published only (Status: Done). */
export async function getDigitalNomadVisas() {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.databases.query({ database_id: DIGITAL_NOMAD_VISA_DB_ID });
    return res.results
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          country: text(p['Country']),
          status: text(p['Status']),
          hasDedicatedVisa: text(p['Has Dedicated Visa']),
          visaName: text(p['Visa Name']),
          incomeThreshold: text(p['Income Threshold']),
          duration: text(p['Duration']),
          applicationDifficulty: text(p['Application Difficulty']),
          taxTreatmentNote: text(p['Tax Treatment Note']),
          sources: text(p['Sources']),
        };
      })
      .filter((d) => (d.status || '').trim().toLowerCase() === 'done');
  } catch (err) {
    console.error('[notion.js] Digital Nomad Visa Comparison fetch failed:', err.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cities & Regions — a lighter-weight tier nested under an existing
// country/state destination (e.g. Medellín under Colombia). Each row relates
// to exactly one parent via "Parent Country" or "Parent State"; the relation
// stores the parent's raw Notion page ID, which is resolved against the
// already-fetched country/state lists rather than a second Notion query.
// ---------------------------------------------------------------------------

/**
 * Raw Cities & Regions rows, Status: Done only, with parent relation IDs
 * left unresolved (see resolveCityParents below). Returns null if Notion
 * isn't configured or the fetch fails.
 */
async function getRawCitiesRegions() {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.databases.query({ database_id: CITIES_REGIONS_DB_ID });
    return res.results
      .map((page) => {
        const p = page.properties;
        const name = text(p['Name']);
        return {
          id: page.id,
          name,
          slug: slugify(name),
          cityType: text(p['City Type']),
          region: text(p['Region']),
          costLevel: text(p['Cost Level']),
          photoId: text(p['Photo ID']),
          homepageTeaser: text(p['Homepage Teaser']),
          status: text(p['Status']),
          parentCountryIds: relationIds(p['Parent Country']),
          parentStateIds: relationIds(p['Parent State']),
        };
      })
      .filter((c) => (c.status || '').trim().toLowerCase() === 'done');
  } catch (err) {
    console.error('[notion.js] Cities & Regions fetch failed:', err.message || err);
    return null;
  }
}

/**
 * Cities & Regions with each row's parent resolved to the parent's own
 * `slug` and `type` ('country' | 'state'), so callers can link to
 * /destinations/[parentSlug]/[citySlug] without a second lookup per city.
 * A city with no resolvable parent (shouldn't happen once data is clean,
 * but Notion relations can be edited by hand) is silently dropped rather
 * than rendered with a broken link.
 */
export async function getCitiesRegions() {
  const [rawCities, countries, states] = await Promise.all([
    getRawCitiesRegions(),
    getCountries(),
    getStates(),
  ]);
  if (!rawCities) return null;

  const parentById = new Map();
  (countries || []).forEach((c) => parentById.set(c.id, { slug: c.slug, name: c.name, type: 'country' }));
  (states || []).forEach((s) => parentById.set(s.id, { slug: s.slug, name: s.name, type: 'state' }));

  return rawCities
    .map((city) => {
      const parentId = city.parentCountryIds[0] || city.parentStateIds[0];
      const parent = parentId ? parentById.get(parentId) : null;
      if (!parent) return null;
      return {
        ...city,
        parentSlug: parent.slug,
        parentName: parent.name,
        parentType: parent.type,
      };
    })
    .filter(Boolean);
}

/** All published cities/regions belonging to one parent destination slug. */
export async function getCitiesForDestination(parentSlug) {
  const cities = await getCitiesRegions();
  if (!cities) return [];
  return cities.filter((c) => c.parentSlug === parentSlug);
}

/**
 * Find one city/region by its parent slug + its own slug, with full page
 * content HTML attached (same renderer used for country/state pages).
 * Returns null if not found.
 */
export async function getCityDetailBySlug(parentSlug, citySlug) {
  const cities = await getCitiesForDestination(parentSlug);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;

  const contentHtml = await getPageContentHtml(city.id);
  return { ...city, contentHtml };
}

/**
 * Fetches a "hub" page (like the Slow Travel or Tax-Residency Rotation
 * overview pages) and separates its narrative content (intro text, purpose,
 * framing) from its list of linked sub-pages (child_page blocks). Each topic
 * includes its page ID and a slug so sub-pages can be linked to and looked
 * up individually. Returns { title, html, topics: [{ id, title, slug }] }.
 * Returns null if unconfigured or not found.
 */
// Headings that mark the end of visitor-facing intro content and the start
// of internal planning notes (checklists, raw Notion links to linked
// databases/related pages) that should never render on the public site.
// Both hubs use slightly different wording for the same kind of notes.
const INTERNAL_SECTION_MARKERS = [
  /^core topics to build$/i,
  /^pages to build$/i,
  /^linked database$/i,
  /^linked databases$/i,
  /^related section$/i,
  /^shared infrastructure$/i,
];

function isInternalSectionHeading(block) {
  const headingText =
    block.type === 'heading_1' ? richTextToHtml(block.heading_1?.rich_text).replace(/<[^>]+>/g, '') :
    block.type === 'heading_2' ? richTextToHtml(block.heading_2?.rich_text).replace(/<[^>]+>/g, '') :
    block.type === 'heading_3' ? richTextToHtml(block.heading_3?.rich_text).replace(/<[^>]+>/g, '') :
    null;
  if (!headingText) return false;
  return INTERNAL_SECTION_MARKERS.some((pattern) => pattern.test(headingText.trim()));
}

export async function getGuideHub(pageId) {
  const client = getClient();
  if (!client || !pageId) return null;

  try {
    const page = await client.pages.retrieve({ page_id: pageId });
    const title = page.properties?.title?.title?.map((t) => t.plain_text).join('') || '';

    const blocks = await getBlockChildren(client, pageId);
    const topics = [];
    const contentBlocks = [];
    let pastInternalMarker = false;

    for (const block of blocks) {
      if (block.type === 'child_page') {
        const topicTitle = block.child_page?.title || 'Untitled';
        topics.push({ id: block.id, title: topicTitle, slug: slugify(topicTitle) });
        continue;
      }
      if (block.type === 'child_database') {
        // Linked databases (e.g. "Slow Travel Destinations") aren't rendered
        // in this minimal version — skip rather than showing raw block noise.
        continue;
      }
      if (isInternalSectionHeading(block)) {
        pastInternalMarker = true;
      }
      if (!pastInternalMarker) {
        contentBlocks.push(block);
      }
      // Once past an internal marker, skip everything else (checklists,
      // raw Notion links) — these are planning notes, not visitor content.
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
