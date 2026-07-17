import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getGlossaryTerms } from '@/lib/glossary';
import styles from './glossary.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Glossary — Tax, Visa & Financial Terms Explained | Next Horizon',
  description:
    'Plain-English definitions for the tax, visa, and financial terms that come up when planning a move abroad or a domestic retirement relocation — FEIE, FTC, territorial tax, totalization agreements, and more.',
};

const CATEGORY_ORDER = ['Tax', 'Visa & Residency', 'Financial', 'General'];

function groupByCategory(terms) {
  const groups = {};
  for (const t of terms) {
    const cat = t.category || 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => a.term.localeCompare(b.term));
  }
  return groups;
}

export default async function GlossaryPage() {
  const terms = await getGlossaryTerms();
  const grouped = groupByCategory(terms);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon</p>
        <h1 className={styles.title}>Glossary</h1>
        <p className={styles.sub}>
          Plain-English definitions for the tax, visa, and financial terms that come up
          throughout our guides and country profiles. These terms are also linked automatically
          the first time they appear in an article — click any linked term in a guide to jump
          straight back here.
        </p>

        {terms.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <section key={cat} className={styles.categorySection}>
              <h2 className={styles.categoryTitle}>{cat}</h2>
              <div className={styles.termList}>
                {grouped[cat].map((t) => (
                  <div key={t.id} id={t.slug} className={styles.termCard}>
                    <h3 className={styles.termName}>{t.term}</h3>
                    <p className={styles.termText}>{t.fullExplanation || t.shortDefinition}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        <Link href="/how-to-use" className={styles.backLink}>
          New here? See how to use this site →
        </Link>
      </div>
      <Footer />
    </main>
  );
}
