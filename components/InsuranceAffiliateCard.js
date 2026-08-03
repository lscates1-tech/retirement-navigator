import styles from './InsuranceAffiliateCard.module.css';

// International health/travel insurance affiliate callout, shown on country
// and US-state destination pages (and inherited by their child city pages
// via the parent's Insurance Affiliate Excluded flag).
//
// Renders nothing if:
//  - the destination is on the insurer's country exclusion list (the
//    "Insurance Affiliate Excluded" checkbox in the Countries / US States
//    Notion databases — see lib/notion.js mapDestination), or
//  - NEXT_PUBLIC_ICI_AFFILIATE_URL isn't set in Vercel env vars yet.
//
// The env-var gate is intentional: until the International Citizens
// Insurance affiliate application is approved and we have a real tracked
// link, this card should stay invisible rather than show visitors a
// placeholder or non-affiliate URL. Once approved, set
// NEXT_PUBLIC_ICI_AFFILIATE_URL in Vercel to the tracked affiliate link
// and this card activates automatically across every eligible destination.
//
// Styling follows the same minimalist affiliate-card language used for
// boxed CTAs in article content (see detail.module.css .calloutCta) — light
// neutral background, thin border, outline button, muted corner tag.
export default function InsuranceAffiliateCard({ destinationName, excluded }) {
  const affiliateUrl = process.env.NEXT_PUBLIC_ICI_AFFILIATE_URL;
  if (excluded || !affiliateUrl) return null;

  return (
    <section
      className={styles.card}
      aria-label={`International health insurance for ${destinationName}`}
    >
      <h2 className={styles.title}>International Health Insurance for {destinationName}</h2>

      <p className={styles.body}>
        Moving abroad usually means your US health plan won&apos;t follow you. International
        Citizens Insurance compares plans from major global insurers side by side, so you can see
        real coverage options for {destinationName} before you go.
      </p>

      <a href={affiliateUrl} target="_blank" rel="noopener sponsored" className={styles.cta}>
        Compare International Health Insurance Plans
      </a>

      <span className={styles.tag}>Affiliate Link</span>
    </section>
  );
}
