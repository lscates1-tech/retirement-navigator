import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getPublishedDestinations } from '@/lib/notion';
import styles from './list.module.css';

export const dynamic = 'force-dynamic';

export default async function DestinationsPage({ searchParams }) {
  const typeFilter = searchParams?.type; // 'country' | 'state' | undefined
  const published = (await getPublishedDestinations()) || [];

  const destinations = published
    .filter((d) => !typeFilter || d.type === typeFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const countryCount = published.filter((d) => d.type === 'country').length;
  const stateCount = published.filter((d) => d.type === 'state').length;

  return (
    <main>
      <Nav />
      <div className={styles.wrap}>
        <h1 className="display" style={{ fontSize: 32 }}>Destinations</h1>
        <p className={styles.sub}>
          {published.length
            ? `${countryCount} countries and ${stateCount} U.S. states, pulled live from Notion.`
            : 'Live Notion data is not configured for this environment — showing nothing until it is.'}
        </p>

        <div className={styles.filterRow}>
          <Link href="/destinations" className={!typeFilter ? styles.filterActive : styles.filter}>
            All
          </Link>
          <Link href="/destinations?type=country" className={typeFilter === 'country' ? styles.filterActive : styles.filter}>
            Countries
          </Link>
          <Link href="/destinations?type=state" className={typeFilter === 'state' ? styles.filterActive : styles.filter}>
            U.S. States
          </Link>
        </div>

        {destinations.length === 0 ? (
          <p className={styles.empty}>No destinations found for this filter yet.</p>
        ) : (
          <div className={styles.grid}>
            {destinations.map((d) => (
              <Link href={`/destinations/${d.slug}`} key={d.id} className={styles.card}>
                <div className={styles.cardType}>{d.type === 'country' ? 'Country' : 'U.S. State'}</div>
                <h3 className={styles.cardName}>{d.name}</h3>
                {d.homepageTeaser ? (
                  <p className={styles.cardTeaser}>{d.homepageTeaser}</p>
                ) : d.type === 'country' ? (
                  <p className={styles.cardTeaser}>{d.visaName || 'Visa & residency details available'}</p>
                ) : (
                  <p className={styles.cardTeaser}>{[d.region, d.costLevel].filter(Boolean).join(' · ')}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
