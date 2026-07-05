import Link from 'next/link';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <div className={styles.nav}>
      <Link href="/" className={`display ${styles.logo}`}>
        Retirement <span className={styles.brass}>Navigator</span>
      </Link>
      <div className={styles.links}>
        <Link href="/destinations">Destinations</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/guides">Guides</Link>
      </div>
    </div>
  );
}
