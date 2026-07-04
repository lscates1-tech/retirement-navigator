import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getSlowTravelDestinations } from '@/lib/notion';
import styles from './destinations.module.css';

export const dynamic = 'force-dynamic';

function Badge({ label, level }) {
  if (!level) return null;
  const cls = /high|strong|widely/i.test(level) ? styles.badgeGreen
    : /medium|adequate|moderately/i.test(level) ? styles.badgeYellow
    : styles.badgeRed;
  return (
    <span className={`${styles.badge} ${cls}`}>
      {label}: {level}
    </span>
  );
}

export default async function SlowTravelDestinationsPage() {
  const destinations = (await getSlowTravelDestinations()) || [];
  const sorted = [...destinations].sort((a, b) => a.destination.localeCompare(b.destination));

  return (
    <main>
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / <Link href="/guides">Slow Travel</Link> / Destinations
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>Slow Travel Destinations</h1>
        <p className={styles.sub}>
          {sorted.length} destinations compared on visa-free stay length, healthcare access, safety, walkability,
          and estimated monthly budget — for readers testing a place before committing to relocation.
        </p>

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <div className={styles.grid}>
            {sorted.map((d) => (
              <div key={d.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{d.destination}</h3>
                  {d.goodForFirstTimers === true && (
                    <span className={styles.firstTimerTag}>Good for first-timers</span>
                  )}
                </div>
                {d.bestFor && <p className={styles.bestFor}>{d.bestFor}</p>}

                <div className={styles.badgeRow}>
                  <Badge label="Safety" level={d.safetyLevel} />
                  <Badge label="Healthcare" level={d.healthcareAccess} />
                  <Badge label="Walkability" level={d.walkability} />
                  <Badge label="English" level={d.englishSpoken} />
                </div>

                <div className={styles.detailsGrid}>
                  {d.estimatedBudget && (
                    <div>
                      <div className={styles.detailLabel}>Est. Monthly Budget</div>
                      <div className={styles.detailValue}>{d.estimatedBudget}</div>
                    </div>
                  )}
                  {d.visaFreeLength && (
                    <div>
                      <div className={styles.detailLabel}>Visa-Free Stay</div>
                      <div className={styles.detailValue}>{d.visaFreeLength}</div>
                    </div>
                  )}
                  {d.bestMonths && (
                    <div>
                      <div className={styles.detailLabel}>Best Months</div>
                      <div className={styles.detailValue}>{d.bestMonths}</div>
                    </div>
                  )}
                  {d.schengen && (
                    <div>
                      <div className={styles.detailLabel}>Schengen Status</div>
                      <div className={styles.detailValue}>{d.schengen}</div>
                    </div>
                  )}
                </div>

                {d.cautions && (
                  <div className={styles.cautions}>
                    <strong>Cautions:</strong> {d.cautions}
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
