import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getTaxResidencyThresholds } from '@/lib/notion';
import styles from './thresholds.module.css';

export const dynamic = 'force-dynamic';

const RISK_ORDER = { High: 0, Medium: 1, Low: 2 };

function riskClass(level) {
  if (level === 'High') return styles.riskHigh;
  if (level === 'Medium') return styles.riskMedium;
  if (level === 'Low') return styles.riskLow;
  return '';
}

export default async function TaxResidencyThresholdsPage() {
  const rows = (await getTaxResidencyThresholds()) || [];
  const sorted = [...rows].sort((a, b) => {
    const riskDiff = (RISK_ORDER[a.riskLevel] ?? 3) - (RISK_ORDER[b.riskLevel] ?? 3);
    return riskDiff !== 0 ? riskDiff : a.country.localeCompare(b.country);
  });

  return (
    <main>
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / <Link href="/guides">Tax-Residency Rotation</Link> / Thresholds
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>Country Tax-Residency Thresholds</h1>
        <p className={styles.sub}>
          {sorted.length} countries, sorted by risk level for rotation planning. The day-count method matters as
          much as the number itself — a 183-day rolling window behaves very differently from a 183-day calendar-year
          count. This is not tax advice; verify current rules with a cross-border tax professional before relying
          on any single-country threshold.
        </p>

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Threshold</th>
                  <th>Day-Count Type</th>
                  <th>Schengen?</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.countryCell}>{r.country}</td>
                    <td>{r.thresholdDays || '—'}</td>
                    <td>{r.dayCountType || '—'}</td>
                    <td>{r.schengen || '—'}</td>
                    <td>
                      {r.riskLevel && (
                        <span className={`${styles.riskBadge} ${riskClass(r.riskLevel)}`}>{r.riskLevel}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.detailList}>
          {sorted.map((r) => (
            (r.additionalTriggers || r.notes) && (
              <div key={r.id} className={styles.detailCard}>
                <h3 className={styles.detailCountry}>{r.country}</h3>
                {r.additionalTriggers && (
                  <p className={styles.detailText}><strong>Additional triggers:</strong> {r.additionalTriggers}</p>
                )}
                {r.notes && (
                  <p className={styles.detailText}><strong>Notes:</strong> {r.notes}</p>
                )}
                {r.citizenshipBasedTax && (
                  <p className={styles.detailText}><strong>Citizenship-based tax:</strong> {r.citizenshipBasedTax}</p>
                )}
              </div>
            )
          ))}
        </div>

        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
