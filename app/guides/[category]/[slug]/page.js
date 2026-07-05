import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getGuideSubPageBySlug } from '@/lib/notion';
import styles from './guide-page.module.css';

export const dynamic = 'force-dynamic';

// Maps the URL category segment to its Notion hub page ID and a display name.
const CATEGORIES = {
  'slow-travel': { hubId: '388995f1-23d7-8100-a8b0-fea7aaf788a0', label: 'Slow Travel' },
  'tax-residency-rotation': { hubId: '388995f1-23d7-81f2-8429-c9103ee847b2', label: 'Tax-Residency Rotation' },
  'national-tax-strategies': { hubId: '393995f1-23d7-81ec-828a-f6abdf4ab78b', label: 'National Tax Strategies' },
  'international-tax-strategies': { hubId: '393995f1-23d7-81e3-a7dc-e500ce25ce11', label: 'International Tax Strategies' },
};

export default async function GuideSubPage({ params }) {
  const { category, slug } = params;
  const categoryInfo = CATEGORIES[category];

  if (!categoryInfo) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 28 }}>Guide not found</h1>
          <p className={styles.notFoundText}>&quot;{category}&quot; isn&apos;t a recognized guide category.</p>
          <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const subPage = await getGuideSubPageBySlug(categoryInfo.hubId, slug);

  if (!subPage) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 28 }}>Page not found</h1>
          <p className={styles.notFoundText}>
            We couldn&apos;t find &quot;{slug.replace(/-/g, ' ')}&quot; in the {categoryInfo.label} guide. It may not
            be published yet, or the Notion connection isn&apos;t configured for this environment.
          </p>
          <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / {categoryInfo.label}
        </div>
        <h1 className={styles.title}>{subPage.title}</h1>
        <article
          className={styles.article}
          dangerouslySetInnerHTML={{
            __html: subPage.html || '<p>This page is still being written.</p>',
          }}
        />
        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
