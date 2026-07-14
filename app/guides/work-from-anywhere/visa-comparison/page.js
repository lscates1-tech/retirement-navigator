import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getDigitalNomadVisas } from '@/lib/notion';
import VisaComparisonClient from './VisaComparisonClient';
import styles from './visa-comparison.module.css';

export const dynamic = 'force-dynamic';

// The count in this description used to be hardcoded ("16 countries") and
// went stale the moment more countries were added to the underlying Notion
// database. Computing it at request time means it never needs a manual
// update again — same fix as the homepage's "55+ destinations" line.
export async function generateMetadata() {
  const rows = (await getDigitalNomadVisas()) || [];
  const description = rows.length
    ? `${rows.length} countries compared on digital nomad visa availability, income thresholds, duration, and tax treatment — for remote workers deciding where to base themselves.`
    : 'Digital nomad visa availability, income thresholds, duration, and tax treatment compared across countries — for remote workers deciding where to base themselves.';
  return {
    title: 'Digital Nomad Visa Comparison | Next Horizon',
    description,
  };
}

export default async function VisaComparisonPage() {
  const rows = (await getDigitalNomadVisas()) || [];

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.breadcrumb}>
          <Link href="/guides">Guides</Link> / <Link href="/guides">Work From Anywhere</Link> / Visa Comparison
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>Digital Nomad Visa Comparison</h1>

        {rows.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <VisaComparisonClient rows={rows} />
        )}

        <Link href="/guides" className={styles.backLink}>← Back to Guides</Link>
      </div>
      <Footer />
    </main>
  );
}
