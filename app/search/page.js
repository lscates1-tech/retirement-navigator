import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { searchSite } from '@/lib/search';
import styles from './search.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Search | Next Horizon',
  description: 'Search destinations, guides, and glossary terms across Next Horizon.',
};

const SECTIONS = [
  { key: 'destinations', label: 'Destinations' },
  { key: 'cities', label: 'Cities & Regions' },
  { key: 'guides', label: 'Guides' },
  { key: 'glossary', label: 'Glossary' },
];

export default async function SearchPage({ searchParams }) {
  const query = (searchParams?.q || '').toString().slice(0, 200);
  const results = query ? await searchSite(query) : null;
  const totalCount = results
    ? SECTIONS.reduce((sum, s) => sum + (results[s.key]?.length || 0), 0)
    : 0;

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon</p>
        <h1 className={styles.title}>Search</h1>

        <form action="/search" method="GET" className={styles.form}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search destinations, guides, glossary terms…"
            className={styles.input}
            autoFocus
          />
          <button type="submit" className={styles.submitBtn}>Search</button>
        </form>

        {!query && (
          <p className={styles.sub}>
            Search across every published country, U.S. state, city profile, guide, and glossary
            term.
          </p>
        )}

        {query && (
          <p className={styles.resultCount}>
            {totalCount === 0
              ? `No results for "${query}"`
              : `${totalCount} result${totalCount === 1 ? '' : 's'} for "${query}"`}
          </p>
        )}

        {results &&
          SECTIONS.filter((s) => results[s.key]?.length).map((s) => (
            <section key={s.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{s.label}</h2>
              <div className={styles.resultList}>
                {results[s.key].map((r) => (
                  <Link key={r.url} href={r.url} className={styles.resultCard}>
                    <p className={styles.resultTitle}>{r.title}</p>
                    {r.snippet && <p className={styles.resultSnippet}>{r.snippet}</p>}
                  </Link>
                ))}
              </div>
            </section>
          ))}

        {query && totalCount === 0 && (
          <p className={styles.sub}>
            Try a broader term, or browse{' '}
            <Link href="/destinations" className={styles.inlineLink}>all destinations</Link> or the{' '}
            <Link href="/glossary" className={styles.inlineLink}>glossary</Link> directly.
          </p>
        )}
      </div>
      <Footer />
    </main>
  );
}
