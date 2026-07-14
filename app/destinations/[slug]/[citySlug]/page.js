import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getCityDetailBySlug, getDestinationBySlug } from '@/lib/notion';
import { getDestinationPhoto, getPhotoById } from '@/lib/photos';
// Reuses the parent destination page's stylesheet — same hero, article,
// and stat-card visual language, so a city page never looks like a
// second, disconnected template.
import styles from '../detail.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug, citySlug } = params;
  const city = await getCityDetailBySlug(slug, citySlug);
  if (!city) {
    return { title: 'City — Next Horizon' };
  }
  const description =
    city.homepageTeaser ||
    `Cost of living, neighborhoods, healthcare access, and safety for ${city.name} — for retiring abroad, working remotely, or finding a home base.`;
  return {
    title: `${city.name} — Cost of Living, Neighborhoods & Safety | Next Horizon`,
    description,
    openGraph: { title: `${city.name} — Next Horizon`, description },
  };
}

function StatRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

export default async function CityDetailPage({ params }) {
  const { slug, citySlug } = params;
  const [city, parent] = await Promise.all([
    getCityDetailBySlug(slug, citySlug),
    getDestinationBySlug(slug),
  ]);

  if (!city) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 28 }}>City not found</h1>
          <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
            We couldn&apos;t find a profile for &quot;{citySlug.replace(/-/g, ' ')}&quot;. It may
            not be published yet, or the Notion connection isn&apos;t configured for this
            environment.
          </p>
          <Link href={`/destinations/${slug}`} className={styles.backLink}>
            ← Back to {parent?.name || 'destination'}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const photo = city.photoId
    ? await getPhotoById(city.photoId)
    : await getDestinationPhoto(`${city.name} cityscape`);

  return (
    <main id="main-content">
      <Nav />

      <div className={styles.hero}>
        {photo ? (
          <img src={photo.url} alt={photo.alt} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}>[ photo: {city.name} ]</div>
        )}
        <div className={styles.heroOverlay}>
          <div className={styles.heroType}>
            {city.cityType || 'City'} · {city.parentName}
          </div>
          <h1 className={styles.heroTitle}>{city.name}</h1>
          {city.homepageTeaser && <p className={styles.heroTeaser}>{city.homepageTeaser}</p>}
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <article
            className={styles.article}
            dangerouslySetInnerHTML={{
              __html: city.contentHtml || '<p>Full profile content is being finalized for this city.</p>',
            }}
          />

          <aside className={styles.sidebar}>
            <div className={styles.sidebarScroll}>
              <div className={styles.statCard}>
                <div className={styles.statCardTitle}>At a glance</div>
                <StatRow label="Type" value={city.cityType} />
                <StatRow label="Region" value={city.region} />
                <StatRow label="Cost level" value={city.costLevel} />
              </div>

              <Link href={`/destinations/${slug}`} className={styles.calcCta}>
                Full {city.parentName} visa, tax &amp; residency guide →
              </Link>

              <Link href="/calculator" className={styles.calcCta}>
                Run the budget calculator →
              </Link>
            </div>
          </aside>
        </div>

        <Link href={`/destinations/${slug}`} className={styles.backLink}>
          ← Back to {city.parentName}
        </Link>
      </div>

      <Footer />
    </main>
  );
}
