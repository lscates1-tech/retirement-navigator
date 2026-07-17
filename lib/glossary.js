import { Client } from '@notionhq/client';

const GLOSSARY_DB_ID = '6a283db8-d5d0-49e4-b199-5839fff626f3';

function getClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

function text(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map((t) => t.plain_text).join('');
  if (prop.type === 'rich_text') return (prop.rich_text || []).map((t) => t.plain_text).join('');
  if (prop.type === 'select') return prop.select?.name || '';
  return '';
}

let cachedTerms = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes — glossary terms don't change often, and this
// gets fetched on every guide/destination page render, so a short cache avoids hammering
// Notion on high-traffic pages without meaningfully delaying content updates.

/**
 * All glossary terms, grouped for the /glossary page. Cached in-memory for a
 * few minutes since this is fetched on essentially every content page render
 * (see autoLinkGlossaryTerms below).
 */
export async function getGlossaryTerms() {
  const now = Date.now();
  if (cachedTerms && now - cachedAt < CACHE_MS) return cachedTerms;

  const client = getClient();
  if (!client) return cachedTerms || [];

  try {
    const res = await client.databases.query({ database_id: GLOSSARY_DB_ID });
    const terms = res.results
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          term: text(p['Term']),
          slug: text(p['Slug']),
          category: text(p['Category']),
          shortDefinition: text(p['Short Definition']),
          fullExplanation: text(p['Full Explanation']),
        };
      })
      .filter((t) => t.term && t.slug);

    cachedTerms = terms;
    cachedAt = now;
    return terms;
  } catch (err) {
    console.error('[glossary] fetch failed:', err.message || err);
    return cachedTerms || [];
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Auto-links the FIRST mention of each glossary term inside a block of
 * rendered page HTML to its definition on /glossary. Deliberately
 * conservative: only the first occurrence per term per page gets linked (so
 * a page mentioning "tax residency" five times doesn't turn into a wall of
 * blue links), matches whole words only, and skips text that's already
 * inside a link or heading tag to avoid nesting links or cluttering titles.
 *
 * This runs on every render (see getPageContentHtml in notion.js) rather
 * than requiring content to be manually edited with links — add a new
 * glossary term once and it starts linking everywhere automatically.
 */
export function autoLinkGlossaryTerms(html, terms) {
  if (!html || !terms || terms.length === 0) return html;

  // Longer terms first, so "US Tax Treaty" matches before a shorter
  // overlapping term would have a chance to.
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);

  let result = html;
  for (const t of sorted) {
    if (!t.term || !t.slug) continue;

    // Split on tags so we only ever match/replace inside plain text nodes,
    // never inside an existing tag's attributes or inside <a>/<h1-4> content.
    const parts = result.split(/(<[^>]+>)/g);
    let linked = false;
    let insideSkipTag = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('<')) {
        const tagMatch = part.match(/^<\/?(\w+)/);
        const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
        if (['a', 'h1', 'h2', 'h3', 'h4'].includes(tagName)) {
          insideSkipTag = part.startsWith('</') ? false : true;
        }
        continue;
      }
      if (linked || insideSkipTag || !part.trim()) continue;

      const pattern = new RegExp(`\\b(${escapeRegex(t.term)})\\b`, 'i');
      if (pattern.test(part)) {
        parts[i] = part.replace(
          pattern,
          `<a href="/glossary#${t.slug}" class="glossary-term-link" title="${t.shortDefinition.replace(/"/g, '&quot;')}">$1</a>`
        );
        linked = true;
      }
    }

    if (linked) result = parts.join('');
  }

  return result;
}
