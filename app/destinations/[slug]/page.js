import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import TaxStrategyCard from '@/components/TaxStrategyCard';
import InsuranceAffiliateCard from '@/components/InsuranceAffiliateCard';
import AffiliateCallout from '@/components/AffiliateCallout';
import { getDestinationDetailBySlug, getDestinationBySlug, getCitiesForDestination, getCtaLink } from '@/lib/notion';
import { getDestinationPhoto, getPhotoById } from '@/lib/photos';
import { buildSectionedArticle } from '@/lib/toc';
import { TAX_STRATEGIES } from '@/lib/taxStrategies';
import styles from './detail.module.css';
import cityStyles from './cities.module.css';

// Cache each destination page and revalidate at most once per hour. This
// decouples visitor traffic from Notion API calls (Notion's rate limit is
// only ~3 req/sec per integration) — a traffic spike now hits the Vercel
// cache instead of Notion directly. Edits in Notion show up within an hour;
// use Vercel's on-demand revalidation if you need changes to appear sooner.
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const d = await getDestinationBySlug(params.slug);
  if (!d) {
    return { title: 'Destination — Next Horizon' };
  }
  const typeLabel = d.type === 'country' ? 'Country' : 'U.S. State';
  const description =
    d.homepageTeaser ||
    `Real cost of living, tax treatment, ${d.type === 'country' ? 'visa rules' : 'domicile considerations'}, and healthcare data for ${d.name} — for retiring abroad, working remotely, or building a home base.`;
  return {
    title: `${d.name} — Cost, Tax & Healthcare Guide | Next Horizon`,
    description,
    openGraph: { title: `${d.name} (${typeLabel}) — Next Horizon`, description },
  };
}

function formatMonthYear(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
    { label: 'US tax treaty', field: 'usTaxTreaty' },
    { label: 'Double taxation notes', field: 'doubleTaxationNotes' },
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

// Mid-article affiliate cards for specific destinations, rendered as real
// React components (see components/AffiliateCallout.js) with their text
// authored directly here in code — deliberately NOT sourced from Notion
// markdown/rich-text for this content, since Notion's bracket syntax
// ([[ ]] reads as a page-mention/link attempt) and rich-text run
// splitting make it an unreliable place to store text that needs to
// render as a structured, styled component rather than plain prose.
//
// The split point anchors on a section heading that's already a stable,
// guaranteed part of every country page's content (e.g. "Climate"),
// rather than on any invented marker text — so there's nothing fragile
// left in the Notion→HTML path for this to depend on.
const DESTINATION_AFFILIATE_CALLOUTS = {
  spain: {
    anchorHeadingId: 'climate',
    icon: '\ud83d\udcf6',
    title: 'Get Set Up Before You Land',
    linkLabel: 'Airalo Spain eSIM',
    linkKey: 'airalo-esim',
    body: 'An eSIM activated before departure sidesteps airport lines and SIM swaps. {LINK} covers high-speed data plans for Spain and the wider Schengen area.',
  },
};

function splitArticleForDestinationCallout(html, slug) {
  const config = DESTINATION_AFFILIATE_CALLOUTS[slug];
  if (!config) return { before: html, after: '', callout: null };

  const anchor = `<details><summary><h2 id="${config.anchorHeadingId}">`;
  const splitIndex = html.indexOf(anchor);
  if (splitIndex === -1) return { before: html, after: '', callout: null };

  return {
    before: html.slice(0, splitIndex),
    after: html.slice(splitIndex),
    callout: config,
  };
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

  const [photo, cities] = await Promise.all([
    d.photoId ? getPhotoById(d.photoId) : getDestinationPhoto(`${d.name} landscape`),
    getCitiesForDestination(d.slug),
  ]);

  const typeLabel = TYPE_LABELS[d.type] || d.type;
  const statFields = [...(STAT_FIELDS_BY_TYPE[d.type] || []), ...SHARED_STAT_FIELDS];
  const { html: articleHtml, toc } = buildSectionedArticle(
    d.contentHtml || '<h2>Profile in progress</h2><p>Full profile content is being finalized for this destination.</p>',
    { openFirstN: 2 }
  );
  const articleSplit = splitArticleForDestinationCallout(articleHtml, d.slug);

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
          {formatMonthYear(d.lastEditedTime) && (
            <p className={styles.lastUpdated}>Last Updated: {formatMonthYear(d.lastEditedTime)}</p>
          )}
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <article className={styles.article}>
            <div dangerouslySetInnerHTML={{ __html: articleSplit.before }} />
            {articleSplit.callout && (
              <AffiliateCallout icon={articleSplit.callout.icon} title={articleSplit.callout.title}>
                {articleSplit.callout.body.split('{LINK}').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <a
                        href={getCtaLink(articleSplit.callout.linkKey)}
                        target="_blank"
                        rel="noopener sponsored"
                      >
                        {articleSplit.callout.linkLabel}
                      </a>
                    )}
                  </React.Fragment>
                ))}
              </AffiliateCallout>
            )}
            {articleSplit.after && <div dangerouslySetInnerHTML={{ __html: articleSplit.after }} />}
          </article>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarScroll}>
            {toc.length > 2 && (
              <nav className={styles.statCard} aria-label="Jump to section">
                <div className={styles.statCardTitle}>Jump to section</div>
                <ul className={styles.tocList}>
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className={styles.tocLink}>{t.title}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

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
                {d.budgetDefaults.lastVerified ? (
                  <div className={styles.confidenceNote}>Data last verified: {d.budgetDefaults.lastVerified}</div>
                ) : d.budgetDefaults.confidence ? (
                  <div className={styles.confidenceNote}>Data confidence: {d.budgetDefaults.confidence}</div>
                ) : null}
              </div>
            ) : null}

            <Link href="/calculator" className={styles.calcCta}>
              Run the budget calculator for {d.name} →
            </Link>
            </div>
          </aside>
        </div>

        <TaxStrategyCard destination={d.name} type={d.type} strategy={TAX_STRATEGIES[d.name]} />
        <InsuranceAffiliateCard destinationName={d.name} excluded={d.insuranceAffiliateExcluded} />

        {cities && cities.length > 0 && (
          <section className={cityStyles.section}>
            <h2 className={cityStyles.sectionTitle}>Cities &amp; Regions in {d.name}</h2>
            <p className={cityStyles.sectionSub}>
              A closer look at specific places to land within {d.name} — cost, neighborhoods, and
              safety at the city level. Visa, tax, and residency details stay in the guide above.
            </p>
            <div className={cityStyles.grid}>
              {cities.map((c) => (
                <Link
                  href={`/destinations/${d.slug}/${c.slug}`}
                  key={c.id}
                  className={cityStyles.card}
                >
                  <div className={cityStyles.cardType}>{c.cityType || 'City'}</div>
                  <h3 className={cityStyles.cardName}>{c.name}</h3>
                  {c.homepageTeaser ? (
                    <p className={cityStyles.cardTeaser}>{c.homepageTeaser}</p>
                  ) : (
                    <p className={cityStyles.cardTeaser}>
                      {[c.region, c.costLevel].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <Link href="/destinations" className={styles.backLink}>← Back to all destinations</Link>
      </div>

      <Footer />
    </main>
  );
}
