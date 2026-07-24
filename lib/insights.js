import { Client } from '@notionhq/client';
import { getPageContentHtml } from './notion';

const INSIGHTS_DB_ID = '9fa53217-6046-45fe-ba2d-e84a79cdeed2';

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
  if (prop.type === 'date') return prop.date?.start || '';
  if (prop.type === 'checkbox') return prop.checkbox === true;
  return '';
}

function mapArticle(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: text(p['Title']),
    slug: text(p['Slug']),
    subtitle: text(p['Subtitle']),
    excerpt: text(p['Excerpt']),
    category: text(p['Category']),
    author: text(p['Author']) || 'Laura Scates',
    publishDate: text(p['Publish Date']),
    photoId: text(p['Hero Image ID']) || null,
    featured: text(p['Featured']) === true,
    status: text(p['Status']),
  };
}

let cachedArticles = null;
let cachedAt = 0;
const CACHE_MS = 2 * 60 * 1000; // 2 minutes — editorial content changes more often than reference data

/**
 * All published Insights articles, newest first. Cached briefly since this
 * is fetched on the hub page, homepage tile, and site search.
 */
export async function getInsightsArticles() {
  const now = Date.now();
  if (cachedArticles && now - cachedAt < CACHE_MS) return cachedArticles;

  const client = getClient();
  if (!client) return cachedArticles || [];

  try {
    const res = await client.databases.query({
      database_id: INSIGHTS_DB_ID,
      filter: { property: 'Status', select: { equals: 'Published' } },
      sorts: [{ property: 'Publish Date', direction: 'descending' }],
    });
    const articles = res.results.map(mapArticle).filter((a) => a.title && a.slug);
    cachedArticles = articles;
    cachedAt = now;
    return articles;
  } catch (err) {
    console.error('[insights] fetch failed:', err.message || err);
    return cachedArticles || [];
  }
}

export async function getFeaturedInsightArticle() {
  const articles = await getInsightsArticles();
  return articles.find((a) => a.featured) || articles[0] || null;
}

export async function getInsightArticleBySlug(slug) {
  const articles = await getInsightsArticles();
  const article = articles.find((a) => a.slug === slug);
  if (!article) return null;
  const contentHtml = await getPageContentHtml(article.id);
  return { ...article, contentHtml };
}

export async function getRelatedInsightArticles(currentSlug, category, limit = 3) {
  const articles = await getInsightsArticles();
  return articles
    .filter((a) => a.slug !== currentSlug && a.category === category)
    .slice(0, limit);
}

export function estimateReadingTime(html) {
  if (!html) return 1;
  const plainText = html.replace(/<[^>]+>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225)); // ~225 wpm average adult reading speed
}
