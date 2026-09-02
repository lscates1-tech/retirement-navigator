import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getRetirementAccountTaxTreatment, slugify } from '@/lib/notion';
import styles from './treatment.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  alternates: { canonical: '/guides/international-tax-strategies/treatment-by-country' },
  title: 'Retirement Account Tax Treatment by Country | Next Horizon',
  description: 'How 25 countries treat Roth IRA, Traditional IRA/401(k), and Social Security income for US retirees — every claim labeled Settled, Contested, or Unclear.',
};

function confidenceClass(level) {
  if (level === 'Settled') return styles.confSettled;
  if (level === 'Contested') return styles.confContested;
  if (level === 'Unclear') return styles.confUnclear;
  return '';
}

function ConfidenceBadge({ level }) {
  if (!level) return null;
  return <span className={`${styles.confBadge} ${confidenceClass(level)}`}>{level}</span>;
}

export default async function TreatmentByCountryPage() {
  const rows = (await getRetirementAccountTaxTreatment()) || [];
  const sorted = [...rows].sort((a, b) => a.country.localeCompare(b.country));

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / <Link href="/guides">International Tax Strategies</Link> / Treatment by Country
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>Retirement Account Tax Treatment by Country</h1>
        <p className={styles.sub}>
          How {sorted.length} countries treat Roth IRA, Traditional IRA/401(k), and Social Security income for US
          retirees who become tax residents there. Every claim is labeled by confidence &mdash; <strong>Settled</strong> means
          documented and consistent across sources, <strong>Contested</strong> means tax authorities haven&apos;t ruled and
          professional opinion is divided, and <strong>Unclear</strong> means no authoritative source directly addresses it.
          This is not tax advice &mdash; see each country&apos;s full page for sources and a recommended advisor type.
        </p>

        <div className={styles.contextNote}>
          <p>
            Most US tax treaties were written decades before the Roth IRA existed &mdash; it wasn&apos;t created until
            1997, and most treaties predate that or were never updated to address it specifically. That&apos;s why
            whether a given country respects the Roth&apos;s US tax-free status is often genuinely unresolved, not a
            settled legal question with one right answer.
          </p>
          <p>
            Where a claim below is Contested or Unclear, we say so explicitly rather than picking the more optimistic
            interpretation and presenting it as settled. Country-specific tax planning at this level of complexity
            shouldn&apos;t be attempted from a website alone &mdash; it should be developed with a cross-border tax
            specialist current on both the US side and the specific country&apos;s domestic law. This page exists to
            help you show up to that conversation with better questions, not to replace it.
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <div className={styles.cards}>
            {sorted.map((r) => {
              const countrySlug = slugify(`${r.country} — Roth IRA and Retirement Account Treatment`);
              const countryHref = `/guides/international-tax-strategies/${countrySlug}`;
              return (
              <div key={r.id} className={styles.card}>
                <h2 className={styles.countryName}>
                  <Link href={countryHref}>{r.country}</Link>
                </h2>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>
                    Roth IRA <ConfidenceBadge level={r.rothConfidence} />
                  </div>
                  <div className={styles.rowText}>{r.rothTreatment}</div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>
                    Traditional IRA / 401(k) / Pension <ConfidenceBadge level={r.traditionalConfidence} />
                  </div>
                  <div className={styles.rowText}>{r.traditionalTreatment}</div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>Social Security</div>
                  <div className={styles.rowText}>{r.socialSecurityTreatment}</div>
                </div>

                <div className={styles.metaGrid}>
                  <div>
                    <div className={styles.metaLabel}>US Tax Treaty</div>
                    <div className={styles.metaValue}>{r.treatyStatus || '—'}</div>
                  </div>
                  <div>
                    <div className={styles.metaLabel}>Wealth Tax</div>
                    <div className={styles.metaValue}>{r.wealthTaxExposure || '—'}</div>
                  </div>
                </div>

                {r.keyPlanningConsideration && (
                  <div className={styles.planningNote}>
                    <strong>Key consideration:</strong> {r.keyPlanningConsideration}
                  </div>
                )}

                {r.recommendedAdvisorType && (
                  <div className={styles.advisorNote}>
                    <strong>Recommended advisor:</strong> {r.recommendedAdvisorType}
                  </div>
                )}

                <Link href={countryHref} className={styles.readMoreLink}>
                  Read the full {r.country} profile →
                </Link>
              </div>
              );
            })}
          </div>
        )}

        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
