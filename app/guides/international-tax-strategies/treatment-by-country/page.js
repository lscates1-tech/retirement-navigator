import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getRetirementAccountTaxTreatment } from '@/lib/notion';
import styles from './treatment.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
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

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <div className={styles.cards}>
            {sorted.map((r) => (
              <div key={r.id} className={styles.card}>
                <h2 className={styles.countryName}>{r.country}</h2>

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
              </div>
            ))}
          </div>
        )}

        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
