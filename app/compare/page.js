import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getPublishedDestinations } from '@/lib/notion';
import styles from './compare.module.css';

export const dynamic = 'force-dynamic';

function money(n) {
  const num = Number(n);
  return num ? `$${num.toLocaleString()}` : '—';
}

function bool(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}

function val(v) {
  return v || v === 0 ? v : '—';
}

function totalBudget(b) {
  if (!b) return null;
  const keys = ['rent', 'own', 'healthcare', 'transportation', 'groceries', 'utilities', 'phone', 'dining', 'misc'];
  const sum = keys.reduce((acc, k) => acc + (Number(b[k]) || 0), 0);
  return sum || null;
}

export default async function ComparePage({ searchParams }) {
  const published = (await getPublishedDestinations()) || [];
  const sorted = [...published].sort((a, b) => a.name.localeCompare(b.name));

  // Default to two sensible destinations if none chosen yet, preferring
  // Featured items so the page never opens empty.
  const featured = sorted.filter((d) => d.featured).sort((a, b) => (Number(a.featuredRank) || 99) - (Number(b.featuredRank) || 99));
  const defaultA = featured[0]?.slug || sorted[0]?.slug || '';
  const defaultB = featured.find((d) => d.slug !== defaultA)?.slug || sorted.find((d) => d.slug !== defaultA)?.slug || '';

  const slugA = searchParams?.a || defaultA;
  const slugB = searchParams?.b || defaultB;

  const a = sorted.find((d) => d.slug === slugA) || null;
  const b = sorted.find((d) => d.slug === slugB) || null;

  const buildSwapUrl = (newA, newB) => `/compare?a=${encodeURIComponent(newA)}&b=${encodeURIComponent(newB)}`;

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <h1 className="display" style={{ fontSize: 32 }}>Compare Destinations</h1>
        <p className={styles.sub}>
          Put any two countries or U.S. states side by side — tax treatment, visa rules, healthcare, and monthly budget, pulled live from Notion.
        </p>

        {sorted.length === 0 ? (
          <p className={styles.empty}>Live Notion data isn&apos;t available in this environment yet.</p>
        ) : (
          <>
            <form className={styles.pickerRow} method="GET">
              <div className={styles.pickerCol}>
                <label className={styles.pickerLabel} htmlFor="a">Destination A</label>
                <select id="a" name="a" defaultValue={slugA} className={styles.picker}>
                  {sorted.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name} {d.type === 'state' ? '(U.S.)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.vs}>vs</div>
              <div className={styles.pickerCol}>
                <label className={styles.pickerLabel} htmlFor="b">Destination B</label>
                <select id="b" name="b" defaultValue={slugB} className={styles.picker}>
                  {sorted.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name} {d.type === 'state' ? '(U.S.)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles.compareBtn}>Compare</button>
            </form>

            {a && b ? (
              <>
                <div className={styles.headerRow}>
                  <div className={styles.headerCard}>
                    <div className={styles.headerType}>{a.type === 'country' ? 'Country' : 'U.S. State'}</div>
                    <h2 className={styles.headerName}>
                      <Link href={`/destinations/${a.slug}`}>{a.name}</Link>
                    </h2>
                  </div>
                  <div className={styles.headerVs}>vs</div>
                  <div className={styles.headerCard}>
                    <div className={styles.headerType}>{b.type === 'country' ? 'Country' : 'U.S. State'}</div>
                    <h2 className={styles.headerName}>
                      <Link href={`/destinations/${b.slug}`}>{b.name}</Link>
                    </h2>
                  </div>
                </div>

                <table className={styles.table}>
                  <tbody>
                    <tr className={styles.sectionRow}><td colSpan={3}>Cost & Region</td></tr>
                    <tr>
                      <td>Region</td>
                      <td>{val(a.region)}</td>
                      <td>{val(b.region)}</td>
                    </tr>
                    <tr>
                      <td>Cost of living vs. US</td>
                      <td>{val(a.costOfLivingVsUS)}</td>
                      <td>{val(b.costOfLivingVsUS)}</td>
                    </tr>
                    <tr>
                      <td>Cost level</td>
                      <td>{val(a.costLevel)}</td>
                      <td>{val(b.costLevel)}</td>
                    </tr>
                    <tr>
                      <td>Est. monthly budget (all categories)</td>
                      <td>{money(totalBudget(a.budgetDefaults))}</td>
                      <td>{money(totalBudget(b.budgetDefaults))}</td>
                    </tr>
                    <tr>
                      <td>Rent (1BR)</td>
                      <td>{money(a.budgetDefaults?.rent)}</td>
                      <td>{money(b.budgetDefaults?.rent)}</td>
                    </tr>
                    <tr>
                      <td>Groceries</td>
                      <td>{money(a.budgetDefaults?.groceries)}</td>
                      <td>{money(b.budgetDefaults?.groceries)}</td>
                    </tr>
                    <tr>
                      <td>Healthcare/Insurance</td>
                      <td>{money(a.budgetDefaults?.healthcare)}</td>
                      <td>{money(b.budgetDefaults?.healthcare)}</td>
                    </tr>

                    <tr className={styles.sectionRow}><td colSpan={3}>Tax & Residency</td></tr>
                    {a.type === 'country' || b.type === 'country' ? (
                      <>
                        <tr>
                          <td>Tax system</td>
                          <td>{a.type === 'country' ? val(a.taxSystem) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.taxSystem) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Visa / residency path</td>
                          <td>{a.type === 'country' ? val(a.visaName) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.visaName) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Visa income threshold</td>
                          <td>{a.type === 'country' ? val(a.visaIncomeThreshold) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.visaIncomeThreshold) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Visa duration / renewal</td>
                          <td>{a.type === 'country' ? val(a.visaDuration) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.visaDuration) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Visa difficulty</td>
                          <td>{a.type === 'country' ? val(a.visaDifficulty) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.visaDifficulty) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Currency</td>
                          <td>{a.type === 'country' ? val(a.currency) : '—'}</td>
                          <td>{b.type === 'country' ? val(b.currency) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Schengen member</td>
                          <td>{a.type === 'country' ? bool(a.schengenMember) : '—'}</td>
                          <td>{b.type === 'country' ? bool(b.schengenMember) : '—'}</td>
                        </tr>
                      </>
                    ) : null}
                    {a.type === 'state' || b.type === 'state' ? (
                      <>
                        <tr>
                          <td>State income tax</td>
                          <td>{a.type === 'state' ? val(a.stateIncomeTax) : '—'}</td>
                          <td>{b.type === 'state' ? val(b.stateIncomeTax) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Social Security taxed?</td>
                          <td>{a.type === 'state' ? val(a.ssTaxTreatment) : '—'}</td>
                          <td>{b.type === 'state' ? val(b.ssTaxTreatment) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Retirement income treatment</td>
                          <td>{a.type === 'state' ? val(a.retirementIncomeTaxTreatment) : '—'}</td>
                          <td>{b.type === 'state' ? val(b.retirementIncomeTaxTreatment) : '—'}</td>
                        </tr>
                        <tr>
                          <td>Property tax level</td>
                          <td>{a.type === 'state' ? val(a.propertyTaxLevel) : '—'}</td>
                          <td>{b.type === 'state' ? val(b.propertyTaxLevel) : '—'}</td>
                        </tr>
                      </>
                    ) : null}

                    <tr className={styles.sectionRow}><td colSpan={3}>Healthcare</td></tr>
                    <tr>
                      <td>{a.type === 'state' || b.type === 'state' ? 'Medicare Advantage market' : 'Healthcare notes'}</td>
                      <td>{a.type === 'state' ? val(a.medicareAdvantageMarket) : val(a.healthcareCostNote)}</td>
                      <td>{b.type === 'state' ? val(b.medicareAdvantageMarket) : val(b.healthcareCostNote)}</td>
                    </tr>
                    {a.type === 'state' || b.type === 'state' ? (
                      <tr>
                        <td>Key senior benefits</td>
                        <td>{a.type === 'state' ? val(a.keySeniorBenefits) : '—'}</td>
                        <td>{b.type === 'state' ? val(b.keySeniorBenefits) : '—'}</td>
                      </tr>
                    ) : null}

                    <tr className={styles.sectionRow}><td colSpan={3}>2026 Notes</td></tr>
                    <tr>
                      <td>Recent changes</td>
                      <td>{a.type === 'country' ? val(a.visaNotes2026) : val(a.medicareNotes2026)}</td>
                      <td>{b.type === 'country' ? val(b.visaNotes2026) : val(b.medicareNotes2026)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className={styles.swapRow}>
                  <Link href={buildSwapUrl(slugB, slugA)} className={styles.swapLink}>⇄ Swap order</Link>
                  <Link href="/calculator" className={styles.calcCta}>Run the full budget calculator →</Link>
                </div>
              </>
            ) : (
              <p className={styles.empty}>Choose two destinations above to compare.</p>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
