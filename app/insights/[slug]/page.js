import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getInsightArticleBySlug, getRelatedInsightArticles, estimateReadingTime } from '@/lib/insights';
import { getPhotoById, getDestinationPhoto } from '@/lib/photos';
import { addHeadingAnchors } from '@/lib/toc';
import styles from './article.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const article = await getInsightArticleBySlug(params.slug);
  if (!article) return { title: 'Article Not Found | Next Horizon Insights' };
  return {
    title: `${article.title} | Next Horizon Insights`,
    description: article.excerpt || article.subtitle,
    alternates: { canonical: `/insights/${params.slug}` },
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function InsightArticlePage({ params }) {
  const article = await getInsightArticleBySlug(params.slug);

  if (!article) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Next Horizon Insights</p>
          <h1 className={styles.title}>Article not found</h1>
          <p className={styles.sub}>
            This article may have been moved or unpublished.{' '}
            <Link href="/insights">Browse all Insights articles →</Link>
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  const [photo, related] = await Promise.all([
    article.photoId ? getPhotoById(article.photoId) : getDestinationPhoto(article.title),
    getRelatedInsightArticles(article.slug, article.category),
  ]);

  const readingTime = estimateReadingTime(article.contentHtml);
  const { html: articleHtml, toc } = addHeadingAnchors(article.contentHtml);

  const shareUrl = `https://nexthorizon.life/insights/${article.slug}`;

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.metaRow}>
          <Link href="/insights" className={styles.backLink}>← Next Horizon Insights</Link>
        </div>

        {article.category && <span className={styles.category}>{article.category}</span>}
        <h1 className={styles.title}>{article.title}</h1>
        {article.subtitle && <p className={styles.subtitle}>{article.subtitle}</p>}

        <div className={styles.attribution}>
          <span className={styles.attributionLabel}>Next Horizon Insights</span>
          <span className={styles.attributionText}>
            Research-driven editorial content curated by Laura Scates and developed using modern
            AI-assisted research and writing tools.
          </span>
        </div>

        <div className={styles.byline}>
          <span>{formatDate(article.publishDate)}</span>
          <span className={styles.dot}>·</span>
          <span>{readingTime} min read</span>
        </div>

        {photo ? (
          <img src={photo.url} alt={photo.alt} className={styles.heroImg} />
        ) : null}

        <div className={styles.layout}>
          <article
            className={styles.article}
            dangerouslySetInnerHTML={{ __html: articleHtml }}
          />

          {toc.length > 2 && (
            <aside className={styles.sidebar}>
              <nav className={styles.tocCard} aria-label="Table of contents">
                <div className={styles.tocTitle}>In this article</div>
                <ul className={styles.tocList}>
                  {toc.map((t) => (
                    <li key={t.id}><a href={`#${t.id}`} className={styles.tocLink}>{t.title}</a></li>
                  ))}
                </ul>
              </nav>

              <div className={styles.shareCard}>
                <div className={styles.tocTitle}>Share this</div>
                <div className={styles.shareRow}>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                    target="_blank" rel="noreferrer" className={styles.shareLink}
                  >
                    X / Twitter
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shareUrl)}`}
                    className={styles.shareLink}
                  >
                    Email
                  </a>
                </div>
              </div>
            </aside>
          )}
        </div>

        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>More in {article.category}</h2>
            <div className={styles.relatedGrid}>
              {related.map((r) => (
                <Link href={`/insights/${r.slug}`} key={r.slug} className={styles.relatedCard}>
                  <h3>{r.title}</h3>
                  {r.excerpt && <p>{r.excerpt}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className={styles.editorialFooter}>
          <h2 className={styles.editorialFooterTitle}>About Next Horizon Insights</h2>
          <p className={styles.editorialFooterText}>
            Next Horizon Insights combines human judgment, thoughtful research, and responsible
            AI-assisted writing tools to help readers make informed decisions about retirement,
            relocation, slow travel, and designing their next chapter of life.
          </p>
          <Link href="/editorial-policy" className={styles.editorialFooterLink}>
            Read our Editorial Philosophy →
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
