import Link from 'next/link';
import { flagForDestination } from '@/lib/taxStrategies';
import styles from './TaxStrategyCard.module.css';

// Scannable strategy comparison card shown on destination detail pages,
// directly below the cost-of-living data (the "Monthly budget defaults"
// stat card). Renders nothing if the destination has no taxStrategy entry,
// or if that entry has enabled: false -- see lib/taxStrategies.js.
export default function TaxStrategyCard({ destination, type, strategy }) {
  if (!strategy || !strategy.enabled) return null;

  const flag = flagForDestination(destination, type);

  return (
    <section className={styles.card} aria-label={`Tax optimization strategy for ${destination}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.flag} aria-hidden="true">{flag}</span>
          <h2 className={styles.title}>{destination} Tax Optimization Strategy</h2>
        </div>
        <span className={styles.badge}>{strategy.badge}</span>
      </div>

      <div className={styles.columns}>
        <div className={`${styles.column} ${styles.optimized}`}>
          <div className={styles.columnLabel}>Optimized Zone</div>
          <div className={styles.zoneName}>{strategy.optimizedZone}</div>
          <ul className={styles.highlightList}>
            {strategy.optimizedHighlights.map((h, i) => (
              <li key={i}><span className={styles.bullet}>✓</span>{h}</li>
            ))}
          </ul>
        </div>

        <div className={`${styles.column} ${styles.standard}`}>
          <div className={styles.columnLabel}>Standard Zone</div>
          <div className={styles.zoneName}>{strategy.standardZone}</div>
          <ul className={styles.highlightList}>
            {strategy.standardHighlights.map((h, i) => (
              <li key={i}><span className={styles.bullet}>•</span>{h}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.tipBox}>
        <span className={styles.tipLabel}>Expat Tip</span>
        <p className={styles.tipText}>{strategy.tip}</p>
      </div>

      <Link
        href={`/calculator?destination=${encodeURIComponent(destination)}`}
        className={styles.cta}
      >
        Run These Numbers in Our Calculator ➔
      </Link>

      <p className={styles.disclaimer}>
        Planning estimate, not tax advice — verify current thresholds and eligibility with a
        qualified tax professional before relying on this for a filing decision.
      </p>
    </section>
  );
}
