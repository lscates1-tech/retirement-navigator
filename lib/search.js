import { getPublishedDestinations, getCitiesRegions, getGuideHub } from './notion';
import { getGlossaryTerms } from './glossary';

// Same hub IDs used in app/guides/page.js and app/sitemap.js — kept in sync
// across all three.
const GUIDE_HUBS = [
  { id: '388995f1-23d7-8100-a8b0-fea7aaf788a0', categorySlug: 'slow-travel', label: 'Slow Travel' },
  { id: '388995f1-23d7-81f2-8429-c9103ee847b2', categorySlug: 'tax-residency-rotation', label: 'Tax-Residency Rotation' },
  { id: '393995f1-23d7-81ec-828a-f6abdf4ab78b', categorySlug: 'national-tax-strategies', label: 'National Tax Strategies' },
  { id: '393995f1-23d7-81e3-a7dc-e500ce25ce11', categorySlug: 'international-tax-strategies', label: 'International Tax Strategies' },
  { id: '39b995f1-23d7-81c2-9a62-c9b1d75e1c88', categorySlug: 'work-from-anywhere', label: 'Work From Anywhere' },
];

function matches(query, ...fields) {
  const q = query.toLowerCase();
  return fields.some((f) => f && f.toString().toLowerCase().includes(q));
}

/**
 * Searches across everything the site publishes: destinations (countries +
 * states), city/region sub-pages, guide topics, and glossary terms. Simple
 * case-insensitive substring matching rather than a real search index —
 * appropriate for the current content volume; worth revisiting if the
 * library grows into the hundreds of pages.
 */
export async function searchSite(query) {
  const q = (query || '').trim();
  if (!q) return { destinations: [], cities: [], guides: [], glossary: [] };

  const results = { destinations: [], cities: [], guides: [], glossary: [] };

  // Destinations (countries + states)
  try {
    const destinations = await getPublishedDestinations();
    if (destinations) {
      results.destinations = destinations
        .filter((d) => matches(q, d.name, d.homepageTeaser, d.region, d.visaName, d.visaProgram))
        .map((d) => ({
          title: d.name,
          url: `/destinations/${d.slug}`,
          snippet: d.homepageTeaser || '',
        }));
    }
  } catch (err) {
    console.error('[search] destinations failed', err);
  }

  // Cities / regions
  try {
    const cities = await getCitiesRegions();
    if (cities) {
      results.cities = cities
        .filter((c) => matches(q, c.name, c.parentSlug))
        .map((c) => ({
          title: c.name,
          url: `/destinations/${c.parentSlug}/${c.slug}`,
          snippet: '',
        }));
    }
  } catch (err) {
    console.error('[search] cities failed', err);
  }

  // Guide topics, across all 5 hubs
  try {
    const hubs = await Promise.all(GUIDE_HUBS.map((h) => getGuideHub(h.id)));
    results.guides = hubs.flatMap((hub, i) => {
      if (!hub || !hub.topics) return [];
      const { categorySlug, label } = GUIDE_HUBS[i];
      return hub.topics
        .filter((t) => matches(q, t.title))
        .map((t) => ({
          title: t.title,
          url: `/guides/${categorySlug}/${t.slug}`,
          snippet: label,
        }));
    });
  } catch (err) {
    console.error('[search] guides failed', err);
  }

  // Glossary terms
  try {
    const terms = await getGlossaryTerms();
    results.glossary = terms
      .filter((t) => matches(q, t.term, t.shortDefinition))
      .map((t) => ({
        title: t.term,
        url: `/glossary#${t.slug}`,
        snippet: t.shortDefinition,
      }));
  } catch (err) {
    console.error('[search] glossary failed', err);
  }

  return results;
}
