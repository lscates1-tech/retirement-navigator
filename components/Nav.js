import Link from 'next/link';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/" className={`display ${styles.logo}`}>
        Next <span className={styles.brass}>Horizon</span>
      </Link>
      <div className={styles.right}>
        <div className={styles.links}>
          <Link href="/how-to-use">How to Use This Site</Link>
          <Link href="/match">Find Your Fit</Link>
          <Link href="/recommend">Get a Recommendation</Link>
          <Link href="/destinations">Destinations</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/calculator">Calculator</Link>
          <Link href="/guides">Guides</Link>
        </div>
        <form action="/search" method="GET" className={styles.searchForm} role="search">
          <input
            type="search"
            name="q"
            placeholder="Search…"
            aria-label="Search Next Horizon"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>
    </nav>
  );
}
