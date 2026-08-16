import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getInsightsArticles } from '@/lib/insights';
import { getPhotoById, getDestinationPhoto } from '@/lib/photos';
import styles from './insights.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  alternates: { canonical: '/insights' },
  title: 'Next Horizon Insights — Thoughtful, Evidence-Based Perspectives',
  description:
    'Investigative, evidence-based articles on relocation, retirement, slow travel, healthcare, finances, and designing your next chapter of life. Not a blog — a place for better questions.',
};

const PER_PAGE = 9;

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

export default async function InsightsPage({ searchParams }) {
  const activeCategory = searchParams?.category || '';
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  const allArticles = await getInsightsArticles();
  const categories = [...new Set(allArticles.map((a) => a.category).filter(Boolean))];

  const filtered = activeCategory
    ? allArticles.filter((a) => a.category === activeCategory)
    : allArticles;

  const featured = !activeCategory ? filtered.find((a) => a.featured) || filtered[0] : null;
  const rest = featured ? filtered.filter((a) => a.slug !== featured.slug) : filtered;

  const totalPages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const pageItems = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const [featuredPhoto, ...gridPhotos] = await Promise.all([
    featured ? (featured.photoId ? getPhotoById(featured.photoId) : getDestinationPhoto(featured.title)) : Promise.resolve(null),
    ...pageItems.map((a) => (a.photoId ? getPhotoById(a.photoId) : getDestinationPhoto(a.title))),
  ]);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon Insights</p>
        <h1 className={styles.title}>Where you live shapes how you live.</h1>
        <p className={styles.sub}>
          Thoughtful, investigative, evidence-based perspectives on relocation, retirement, slow
          travel, and designing a meaningful next chapter — not a blog, and not another listicle.
          The goal here isn&apos;t to sell you a dream. It&apos;s to help you ask better questions.
        </p>

        {allArticles.length === 0 ? (
          <p className={styles.empty}>New articles are on the way — check back soon.</p>
        ) : (
          <>
            {featured && (
              <Link href={`/insights/${featured.slug}`} className={styles.featuredCard}>
                {featuredPhoto ? (
                  <img src={featuredPhoto.url} alt={featuredPhoto.alt} className={styles.featuredImg} />
                ) : (
                  <div className={styles.featuredImgFallback} />
                )}
                <div className={styles.featuredBody}>
                  <span className={styles.featuredTag}>Featured</span>
                  {featured.category && <span className={styles.cardCategory}>{featured.category}</span>}
                  <h2 className={styles.featuredTitle}>{featured.title}</h2>
                  {featured.excerpt && <p className={styles.featuredExcerpt}>{featured.excerpt}</p>}
                  <span className={styles.readMore}>Read the article →</span>
                </div>
              </Link>
            )}

            <div className={styles.categoryRow}>
              <Link href="/insights" className={!activeCategory ? styles.categoryPillActive : styles.categoryPill}>
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/insights?category=${encodeURIComponent(cat)}`}
                  className={activeCategory === cat ? styles.categoryPillActive : styles.categoryPill}
                >
                  {cat}
                </Link>
              ))}
            </div>

            <div className={styles.grid}>
              {pageItems.map((a, i) => {
                const photo = gridPhotos[i];
                return (
                  <Link href={`/insights/${a.slug}`} key={a.slug} className={styles.card}>
                    {photo ? (
                      <img src={photo.url} alt={photo.alt} className={styles.cardImg} />
                    ) : (
                      <div className={styles.cardImgFallback} />
                    )}
                    <div className={styles.cardBody}>
                      {a.category && <span className={styles.cardCategory}>{a.category}</span>}
                      <h3 className={styles.cardTitle}>{a.title}</h3>
                      {a.excerpt && <p className={styles.cardExcerpt}>{a.excerpt}</p>}
                      <span className={styles.cardDate}>{formatDate(a.publishDate)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {rest.length === 0 && (
              <p className={styles.empty}>No other articles in this category yet — check back soon.</p>
            )}

            {totalPages > 1 && (
              <div className={styles.pagination}>
                {page > 1 && (
                  <Link href={`/insights?${activeCategory ? `category=${encodeURIComponent(activeCategory)}&` : ''}page=${page - 1}`} className={styles.pageLink}>
                    ← Newer
                  </Link>
                )}
                <span className={styles.pageStatus}>Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link href={`/insights?${activeCategory ? `category=${encodeURIComponent(activeCategory)}&` : ''}page=${page + 1}`} className={styles.pageLink}>
                    Older →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
