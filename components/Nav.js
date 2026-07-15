import Link from 'next/link';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/" className={`display ${styles.logo}`}>
        Next <span className={styles.brass}>Horizon</span>
      </Link>
      <div className={styles.links}>
        <Link href="/match">Find Your Fit</Link>
        <Link href="/recommend">Get a Recommendation</Link>
        <Link href="/destinations">Destinations</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/guides">Guides</Link>
      </div>
    </nav>
  );
}
