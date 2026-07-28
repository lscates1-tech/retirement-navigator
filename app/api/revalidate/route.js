import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-demand cache-busting. Two layers of caching exist on this site and
 * BOTH need clearing to see a fresh edit immediately — clearing only one
 * can still show stale data:
 *
 *   1. Page cache (ISR) — destination, calculator, guide, glossary, and
 *      city pages have `export const revalidate = 3600`. Cleared with
 *      `path`.
 *   2. Data cache — the raw Notion queries in lib/notion.js
 *      (getCountries, getStates, getRawCitiesRegions, getGuideHub) are
 *      wrapped in `unstable_cache` for an hour, independent of any page's
 *      own cache. Cleared with `tag`.
 *
 * Usage (secret is required, from the REVALIDATE_SECRET env var):
 *
 *   Just published/edited a country or state in Notion — easiest option,
 *   clears everything so you don't have to think about which tag/path:
 *     /api/revalidate?secret=YOUR_SECRET&all=1
 *
 *   Only want to clear one destination page (faster, more targeted):
 *     /api/revalidate?secret=YOUR_SECRET&path=/destinations/portugal&tag=notion-countries
 *
 *   Only edited a guide:
 *     /api/revalidate?secret=YOUR_SECRET&path=/guides&tag=notion-guide-hub
 *
 * Set REVALIDATE_SECRET in Vercel's project environment variables — any
 * long random string works, it just has to match what's in the URL.
 */

const ALL_TAGS = ['notion-countries', 'notion-states', 'notion-cities-regions', 'notion-guide-hub'];

const ALL_PATHS = ['/destinations', '/calculator', '/guides', '/glossary', '/compare', '/match', '/search'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_SECRET is not set in the environment' },
      { status: 500 }
    );
  }

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ revalidated: false, error: 'Invalid secret' }, { status: 401 });
  }

  const clearAll = searchParams.get('all') === '1';
  const paths = clearAll ? ALL_PATHS : searchParams.getAll('path');
  const tags = clearAll ? ALL_TAGS : searchParams.getAll('tag');

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json(
      {
        revalidated: false,
        error: 'Provide ?all=1, or at least one ?path= or ?tag= parameter',
        knownTags: ALL_TAGS,
      },
      { status: 400 }
    );
  }

  paths.forEach((p) => revalidatePath(p));
  tags.forEach((t) => revalidateTag(t));

  return NextResponse.json({ revalidated: true, all: clearAll, paths, tags, now: Date.now() });
}
