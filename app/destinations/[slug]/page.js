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

// Field-driven "At a Glance" configuration. Adding a new destination type
// (e.g. 'city') later means adding one new entry here — no new branching
// logic anywhere else. Fields that have no data for a given destination
// simply don't render (StatRow already handles that), so this list can be
// generous without risk of showing empty rows.
const STAT_FIELDS_BY_TYPE = {
  country: [
    { label: 'Visa', field: 'visaName' },
    { label: 'Income threshold', field: 'visaIncomeThreshold' },
    { label: 'Visa duration', field: 'visaDuration' },
    { label: 'Visa difficulty', field: 'visaDifficulty' },
    { label: 'Tax system', field: 'taxSystem' },
    { label: 'Currency', field: 'currency' },
    { label: 'Schengen member', field: 'schengenMember', format: 'boolean' },
  ],
  state: [
    { label: 'Region', field: 'region' },
    { label: 'Cost level', field: 'costLevel' },
    { label: 'State income tax', field: 'stateIncomeTax' },
    { label: 'Social Security', field: 'ssTaxTreatment' },
    { label: 'Property tax level', field: 'propertyTaxLevel' },
    { label: 'Medicare Advantage market', field: 'medicareAdvantageMarket' },
    { label: 'Major airports', field: 'majorGatewayAirports' },
  ],
  // city: [ ... ] — ready to add later (walkability, neighborhood
  // character, nearest major airport) with zero changes to the render
  // logic below.
};

// Shown for every destination type, after the type-specific fields above.
const SHARED_STAT_FIELDS = [{ label: 'Cost of living vs. US', field: 'costOfLivingVsUS' }];

// Hero badge label per type — same "add one entry" pattern as the stat
// fields above.
const TYPE_LABELS = { country: 'Country', state: 'U.S. State' };

function formatStatValue(rawValue, format) {
  if (format === 'boolean') {
    if (rawValue === true) return 'Yes';
    if (rawValue === false) return 'No';
    return '';
  }
  return rawValue;
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

  const typeLabel = TYPE_LABELS[d.type] || d.type;
  const statFields = [...(STAT_FIELDS_BY_TYPE[d.type] || []), ...SHARED_STAT_FIELDS];

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
          <div className={styles.heroType}>{typeLabel}</div>
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

              {statFields.map((f) => (
                <StatRow
                  key={f.field}
                  label={f.label}
                  value={formatStatValue(d[f.field], f.format)}
                />
              ))}
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
