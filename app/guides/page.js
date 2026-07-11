import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getGuideHub } from '@/lib/notion';
import styles from './guides.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Guides — Slow Travel, Tax-Residency Rotation & Tax Strategy | Next Horizon',
  description: 'In-depth, sourced guides on slow travel, tax-residency rotation, national and international tax strategy — for anyone planning where and how to live next.',
};

// Page IDs for the two guide hub pages in Notion. These are stable IDs from
// the workspace and won't change even as the pages' content is edited.
const SLOW_TRAVEL_HUB_ID = '388995f1-23d7-8100-a8b0-fea7aaf788a0';
const TAX_ROTATION_HUB_ID = '388995f1-23d7-81f2-8429-c9103ee847b2';
const NATIONAL_TAX_HUB_ID = '393995f1-23d7-81ec-828a-f6abdf4ab78b';
const INTERNATIONAL_TAX_HUB_ID = '393995f1-23d7-81e3-a7dc-e500ce25ce11';

function GuideSection({ emoji, hub, fallbackTitle, categorySlug, databaseLink }) {
  if (!hub) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{fallbackTitle}</h2>
        <p className={styles.empty}>This guide isn&apos;t available in this environment yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {emoji && <span className={styles.emoji}>{emoji}</span>}
        {hub.title || fallbackTitle}
      </h2>
      <div className={styles.intro} dangerouslySetInnerHTML={{ __html: hub.html }} />

      {databaseLink && (
        <Link href={databaseLink.href} className={styles.databaseLink}>
          {databaseLink.label} →
        </Link>
      )}

      {hub.topics.length > 0 && (
        <>
          <div className={styles.topicsLabel}>Topics in this guide</div>
          <ul className={styles.topicsList}>
            {hub.topics.map((topic) => (
              <li key={topic.id} className={styles.topicItem}>
                <Link href={`/guides/${categorySlug}/${topic.slug}`} className={styles.topicLink}>
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function GuidesPage() {
  const [slowTravelHub, taxRotationHub, nationalTaxHub, internationalTaxHub] = await Promise.all([
    getGuideHub(SLOW_TRAVEL_HUB_ID),
    getGuideHub(TAX_ROTATION_HUB_ID),
    getGuideHub(NATIONAL_TAX_HUB_ID),
    getGuideHub(INTERNATIONAL_TAX_HUB_ID),
  ]);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <h1 className="display" style={{ fontSize: 32 }}>Guides</h1>
        <p className={styles.sub}>
          In-depth guidance for two different kinds of location-independent retirement: testing a place before
          committing, and deliberately staying mobile long-term.
        </p>

        <GuideSection
          emoji="🐣"
          hub={slowTravelHub}
          fallbackTitle="Slow Travel"
          categorySlug="slow-travel"
          databaseLink={{ href: '/guides/slow-travel/destinations', label: 'Browse the Slow Travel Destinations comparison table' }}
        />
        <GuideSection
          emoji="🧭"
          hub={taxRotationHub}
          fallbackTitle="Tax-Residency Rotation"
          categorySlug="tax-residency-rotation"
          databaseLink={{ href: '/guides/tax-residency-rotation/thresholds', label: 'Browse Country Tax-Residency Thresholds' }}
        />
        <GuideSection
          emoji="🧾"
          hub={nationalTaxHub}
          fallbackTitle="National Tax Strategies"
          categorySlug="national-tax-strategies"
        />
        <GuideSection
          emoji="🌍"
          hub={internationalTaxHub}
          fallbackTitle="International Tax Strategies"
          categorySlug="international-tax-strategies"
          databaseLink={{ href: '/guides/international-tax-strategies/treatment-by-country', label: 'Browse Retirement Account Tax Treatment by Country' }}
        />
      </div>
      <Footer />
    </main>
  );
}
