import styles from './AffiliateCallout.module.css';

// Reusable affiliate resource card for mid-article placements. Unlike the
// Notion-driven `.calloutCta` boxes used elsewhere in article content, this
// component's text lives directly in code (see the config passed in from
// the page that renders it), so it's immune to the whitespace-loss bug
// that can occur when Notion's rich-text splits a sentence across multiple
// runs. Use this specifically when a callout's wording needs to be
// guaranteed pixel/character-perfect.
export default function AffiliateCallout({
  icon,
  title,
  children,
  tagLeft = 'Recommended Partner',
  tagRight = 'Affiliate Link',
}) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.content}>
          <div className={styles.titleRow}>
            {icon && <span aria-hidden="true">{icon}</span>}
            <h3 className={styles.title}>{title}</h3>
          </div>
          <p className={styles.body}>{children}</p>
        </div>
      </div>

      <div className={styles.footer}>
        <span>{tagLeft}</span>
        <span>{tagRight}</span>
      </div>
    </div>
  );
}
