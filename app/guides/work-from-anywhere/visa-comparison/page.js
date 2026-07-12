import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getDigitalNomadVisas } from '@/lib/notion';
import styles from './visa-comparison.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Digital Nomad Visa Comparison | Next Horizon',
  description: '16 countries compared on digital nomad visa availability, income thresholds, duration, and tax treatment — for remote workers deciding where to base themselves.',
};

const DIFFICULTY_ORDER = { Easy: 0, Moderate: 1, Complex: 2 };

function difficultyClass(level) {
  if (level === 'Easy') return styles.diffEasy;
  if (level === 'Moderate') return styles.diffModerate;
  if (level === 'Complex') return styles.diffComplex;
  return '';
}

export default async function VisaComparisonPage() {
  const rows = (await getDigitalNomadVisas()) || [];
  const sorted = [...rows].sort((a, b) => {
    const hasVisaDiff = (a.hasDedicatedVisa === 'Yes' ? 0 : 1) - (b.hasDedicatedVisa === 'Yes' ? 0 : 1);
    if (hasVisaDiff !== 0) return hasVisaDiff;
    const diffDiff = (DIFFICULTY_ORDER[a.applicationDifficulty] ?? 3) - (DIFFICULTY_ORDER[b.applicationDifficulty] ?? 3);
    if (diffDiff !== 0) return diffDiff;
    return a.country.localeCompare(b.country);
  });

  const withVisa = sorted.filter((d) => d.hasDedicatedVisa === 'Yes');
  const withoutVisa = sorted.filter((d) => d.hasDedicatedVisa !== 'Yes');

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / <Link href="/guides">Work From Anywhere</Link> / Visa Comparison
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>Digital Nomad Visa Comparison</h1>
        <p className={styles.sub}>
          {sorted.length} countries compared on visa availability, income threshold, duration, and tax
          treatment. {withVisa.length} have a dedicated digital nomad visa program; {withoutVisa.length} rely on
          standard visa categories not specifically built for remote income. This is not immigration or tax
          advice — confirm current requirements directly before applying.
        </p>

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <>
            <div className={styles.sectionLabel}>Countries with a dedicated digital nomad visa</div>
            <div className={styles.cards}>
              {withVisa.map((d) => (
                <div key={d.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.countryName}>{d.country}</h2>
                    {d.applicationDifficulty && (
                      <span className={`${styles.diffBadge} ${difficultyClass(d.applicationDifficulty)}`}>
                        {d.applicationDifficulty}
                      </span>
                    )}
                  </div>
                  <div className={styles.visaName}>{d.visaName}</div>
                  <div className={styles.detailsGrid}>
                    {d.incomeThreshold && (
                      <div>
                        <div className={styles.detailLabel}>Income Threshold</div>
                        <div className={styles.detailValue}>{d.incomeThreshold}</div>
                      </div>
                    )}
                    {d.duration && (
                      <div>
                        <div className={styles.detailLabel}>Duration</div>
                        <div className={styles.detailValue}>{d.duration}</div>
                      </div>
                    )}
                  </div>
                  {d.taxTreatmentNote && (
                    <div className={styles.taxNote}>
                      <strong>Tax note:</strong> {d.taxTreatmentNote}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {withoutVisa.length > 0 && (
              <>
                <div className={styles.sectionLabel} style={{ marginTop: 40 }}>
                  Countries without a dedicated remote-work visa
                </div>
                <div className={styles.cards}>
                  {withoutVisa.map((d) => (
                    <div key={d.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.countryName}>{d.country}</h2>
                        {d.applicationDifficulty && (
                          <span className={`${styles.diffBadge} ${difficultyClass(d.applicationDifficulty)}`}>
                            {d.applicationDifficulty}
                          </span>
                        )}
                      </div>
                      <div className={styles.visaName}>{d.visaName}</div>
                      {d.taxTreatmentNote && (
                        <div className={styles.taxNote}>
                          <strong>Tax note:</strong> {d.taxTreatmentNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
