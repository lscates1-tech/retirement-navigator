import { getPublishedDestinations, getCitiesRegions, getGuideHub } from '@/lib/notion';

const BASE_URL = 'https://nexthorizon.life';

// Same hub IDs used in app/guides/page.js — kept in sync there.
const GUIDE_HUBS = [
  { id: '388995f1-23d7-8100-a8b0-fea7aaf788a0', categorySlug: 'slow-travel' },
  { id: '388995f1-23d7-81f2-8429-c9103ee847b2', categorySlug: 'tax-residency-rotation' },
  { id: '393995f1-23d7-81ec-828a-f6abdf4ab78b', categorySlug: 'national-tax-strategies' },
  { id: '393995f1-23d7-81e3-a7dc-e500ce25ce11', categorySlug: 'international-tax-strategies' },
  { id: '39b995f1-23d7-81c2-9a62-c9b1d75e1c88', categorySlug: 'work-from-anywhere' },
];

export default async function sitemap() {
  const staticRoutes = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/match`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/recommend`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/destinations`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/compare`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/calculator`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/guides`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/guides/slow-travel/destinations`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guides/tax-residency-rotation/thresholds`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guides/international-tax-strategies/treatment-by-country`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guides/work-from-anywhere/visa-comparison`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Destination detail pages (countries + states), pulled live so new
  // profiles show up automatically without editing this file.
  let destinationRoutes = [];
  try {
    const destinations = await getPublishedDestinations();
    if (destinations) {
      destinationRoutes = destinations.map((d) => ({
        url: `${BASE_URL}/destinations/${d.slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('[sitemap] failed to fetch destinations', err);
  }

  // City/region sub-pages.
  let cityRoutes = [];
  try {
    const cities = await getCitiesRegions();
    if (cities) {
      cityRoutes = cities.map((c) => ({
        url: `${BASE_URL}/destinations/${c.parentSlug}/${c.slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    }
  } catch (err) {
    console.error('[sitemap] failed to fetch cities', err);
  }

  // Individual guide topic pages, pulled live from each hub.
  let guideTopicRoutes = [];
  try {
    const hubs = await Promise.all(GUIDE_HUBS.map((h) => getGuideHub(h.id)));
    guideTopicRoutes = hubs.flatMap((hub, i) => {
      if (!hub || !hub.topics) return [];
      const categorySlug = GUIDE_HUBS[i].categorySlug;
      return hub.topics.map((topic) => ({
        url: `${BASE_URL}/guides/${categorySlug}/${topic.slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    });
  } catch (err) {
    console.error('[sitemap] failed to fetch guide topics', err);
  }

  return [...staticRoutes, ...destinationRoutes, ...cityRoutes, ...guideTopicRoutes];
}
