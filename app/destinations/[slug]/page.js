import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getDestinationDetailBySlug } from '@/lib/notion';
import { getDestinationPhoto, getPhotoById } from '@/lib/photos';
import styles from './detail.module.css';

// Fetch fresh on every request for now — matches the calculator's approach
// and makes it easy to confirm Notion edits show up immediately. Switch to
// `export const revalidate = 3600;` once this is confirmed working well.
export const dynamic = 'force-dynamic';

function StatRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

export default async function DestinationDetailPage({ params }) {
  const { slug } = params;
  const d = await getDestinationDetailBySlug(slug);

  if (!d) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 28 }}>Destination not found</h1>
          <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
            We couldn&apos;t find a profile for &quot;{slug.replace(/-/g, ' ')}&quot;. It may not be
            published yet, or the Notion connection isn&apos;t configured for this environment.
          </p>
          <Link href="/destinations" className={styles.backLink}>← Back to all destinations</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const photo = d.photoId
    ? await getPhotoById(d.photoId)
    : await getDestinationPhoto(`${d.name} landscape`);

  const isCountry = d.type === 'country';

  return (
    <main id="main-content">
      <Nav />

      <div className={styles.hero}>
        {photo ? (
          <img src={photo.url} alt={photo.alt} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}>[ photo: {d.name} ]</div>
        )}
        <div className={styles.heroOverlay}>
          <div className={styles.heroType}>{isCountry ? 'Country' : 'U.S. State'}</div>
          <h1 className={styles.heroTitle}>{d.name}</h1>
          {d.homepageTeaser && <p className={styles.heroTeaser}>{d.homepageTeaser}</p>}
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <article
            className={styles.article}
            dangerouslySetInnerHTML={{
              __html: d.contentHtml || '<p>Full profile content is being finalized for this destination.</p>',
            }}
          />

          <aside className={styles.sidebar}>
            <div className={styles.sidebarScroll}>
            <div className={styles.statCard}>
              <div className={styles.statCardTitle}>At a glance</div>

              {isCountry ? (
                <>
                  <StatRow label="Visa" value={d.visaName} />
                  <StatRow label="Income threshold" value={d.visaIncomeThreshold} />
                  <StatRow label="Visa duration" value={d.visaDuration} />
                  <StatRow label="Visa difficulty" value={d.visaDifficulty} />
                  <StatRow label="Tax system" value={d.taxSystem} />
                  <StatRow label="Currency" value={d.currency} />
                  <StatRow label="Schengen member" value={d.schengenMember === true ? 'Yes' : d.schengenMember === false ? 'No' : ''} />
                </>
              ) : (
                <>
                  <StatRow label="Region" value={d.region} />
                  <StatRow label="Cost level" value={d.costLevel} />
                  <StatRow label="State income tax" value={d.stateIncomeTax} />
                  <StatRow label="Social Security" value={d.ssTaxTreatment} />
                  <StatRow label="Property tax level" value={d.propertyTaxLevel} />
                  <StatRow label="Medicare Advantage market" value={d.medicareAdvantageMarket} />
                  <StatRow label="Major airports" value={d.majorGatewayAirports} />
                </>
              )}

              <StatRow label="Cost of living vs. US" value={d.costOfLivingVsUS} />
            </div>

            {d.budgetDefaults?.rent ? (
              <div className={styles.statCard}>
                <div className={styles.statCardTitle}>Monthly budget defaults</div>
                <StatRow label="Rent (1BR)" value={d.budgetDefaults.rent ? `$${d.budgetDefaults.rent}` : ''} />
                <StatRow label="Groceries" value={d.budgetDefaults.groceries ? `$${d.budgetDefaults.groceries}` : ''} />
                <StatRow label="Healthcare" value={d.budgetDefaults.healthcare ? `$${d.budgetDefaults.healthcare}` : ''} />
                <StatRow label="Transportation" value={d.budgetDefaults.transportation ? `$${d.budgetDefaults.transportation}` : ''} />
                <StatRow label="Dining/entertainment" value={d.budgetDefaults.dining ? `$${d.budgetDefaults.dining}` : ''} />
                <StatRow label="Utilities" value={d.budgetDefaults.utilities ? `$${d.budgetDefaults.utilities}` : ''} />
                {d.budgetDefaults.confidence && (
                  <div className={styles.confidenceNote}>Data confidence: {d.budgetDefaults.confidence}</div>
                )}
              </div>
            ) : null}

            <Link href="/calculator" className={styles.calcCta}>
              Run the budget calculator for {d.name} →
            </Link>
            </div>
          </aside>
        </div>

        <Link href="/destinations" className={styles.backLink}>← Back to all destinations</Link>
      </div>

      <Footer />
    </main>
  );
}
