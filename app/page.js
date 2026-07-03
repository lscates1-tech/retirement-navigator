import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getDestinationPhoto, getPhotoById } from '@/lib/photos';
import { getFeaturedDestinations } from '@/lib/notion';
import styles from './page.module.css';

const FALLBACK_DESTINATIONS = [
  { name: 'Italy', type: 'country', tag: '7% flat tax towns', blurb: "A targeted incentive most retirees never hear about until it's too late to use it.", photoId: 'PeLkhi_B3wI' },
  { name: 'Panama', type: 'country', tag: 'USD · territorial', blurb: 'No currency risk, no foreign tax on Social Security or pensions.', photoId: 'jVCXlJrnl5w' },
  { name: 'Florida', type: 'state', tag: 'No income tax', blurb: 'Best Europe and Latin America flight access of any no-tax state.', query: 'Miami Florida coast' },
  { name: 'Spain', type: 'country', tag: 'Top-tier healthcare', blurb: "One of Europe's best public systems — with a real Roth IRA tax surprise.", photoId: 'uYMyUKL1QSU' },
  { name: 'Thailand', type: 'country', tag: 'World-class care, fraction of cost', blurb: 'JCI-accredited private hospitals and genuine lifestyle range, all in one country.', photoId: 'DxPug2BdSao' },
  { name: 'Slovenia', type: 'country', tag: 'Real winters, EU access', blurb: 'The one destination here built for retirees who actually miss the cold.', query: 'Lake Bled Slovenia island church' },
];
function PlaceholderScene({ label }) {
  return (
    <div
      className={styles.cardScene}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #D9D6E8, #EFEAE0)',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10,
        color: '#8A8678',
        letterSpacing: '0.04em',
      }}
    >
      [ photo: {label} ]
    </div>
  );
}

export default async function HomePage() {
  const heroPhoto = await getDestinationPhoto('Algarve Portugal Ponta da Piedade cliffs');

  const liveFeatured = await getFeaturedDestinations();
  const usingLiveData = Boolean(liveFeatured && liveFeatured.length);

  // Normalize both the live Notion rows and the fallback array into one
  // shape so the render code below doesn't need to know which source it's using.
  const GRID_DESTINATIONS = usingLiveData
    ? liveFeatured.map((d) => ({
        name: d.name,
        type: d.type,
        slug: d.slug,
        tag: d.type === 'country' ? (d.visaName || d.taxSystem || '') : (d.stateIncomeTax || d.ssTaxTreatment || ''),
        blurb: d.homepageTeaser || '',
        photoId: d.photoId || undefined,
        query: d.photoId ? undefined : `${d.name} landscape`,
      }))
    : FALLBACK_DESTINATIONS.map((d) => ({ ...d, slug: d.name.toLowerCase().replace(/\s+/g, '-') }));

  const gridPhotos = await Promise.all(
    GRID_DESTINATIONS.map((d) => (d.photoId ? getPhotoById(d.photoId) : getDestinationPhoto(d.query)))
  );

  return (
    <main>
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
           <div className={styles.eyebrow}>40+ destinations · verified 2026 cost &amp; tax data</div>
            <h1 className={styles.h1}>
              Where you retire is a financial decision <em>disguised</em> as a lifestyle one.
            </h1>
            <p className={styles.sub}>
              Compare real tax thresholds, visa rules, healthcare costs, and monthly budgets
              across countries and U.S. states — before you commit to anything.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/calculator" className={styles.cta}>
                Run the budget calculator
              </Link>
              <Link href="/compare" className={styles.ctaGhost}>
                Compare two destinations
              </Link>
            </div>
          </div>

          <div className={styles.plate}>
            {heroPhoto ? (
              <img
                src={heroPhoto.url}
                alt={heroPhoto.alt}
                style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 3, display: 'block' }}
              />
            ) : (
              <PlaceholderScene label="Algarve, Portugal" />
            )}
            <div className={styles.plateCap}>
              {heroPhoto ? (
                <>
                  Photo by{' '}
                  <a href={heroPhoto.creditUrl} target="_blank" rel="noreferrer">
                    {heroPhoto.credit}
                  </a>
                </>
              ) : (
                'COASTLINE, WESTERN EUROPE'
              )}
            </div>
          </div>
        </div>

        <div className={styles.strip}>
          <div className={styles.stamp}>
            <div className={styles.stampCoord}>38.7°N · PORTUGAL</div>
            <div className={styles.stampName}>Portugal</div>
            <div className={styles.stampRow}>Single budget <b>$1,800/mo</b></div>
            <div className={styles.stampRow}>Tax system <b>Worldwide</b></div>
            <div className={styles.stampRow}>Visa path <b>D7</b></div>
          </div>
          <div className={styles.stamp}>
            <div className={styles.stampCoord}>9.7°N · COSTA RICA</div>
            <div className={styles.stampName}>Costa Rica</div>
            <div className={styles.stampRow}>Single budget <b>$1,840/mo</b></div>
            <div className={styles.stampRow}>Tax system <b>Territorial</b></div>
            <div className={styles.stampRow}>Visa path <b>Pensionado</b></div>
          </div>
          <div className={styles.stamp}>
            <div className={styles.stampCoord}>31.0°N · TEXAS</div>
            <div className={styles.stampName}>Texas</div>
            <div className={styles.stampRow}>Single budget <b>$2,990/mo</b></div>
            <div className={styles.stampRow}>State income tax <b>None</b></div>
            <div className={styles.stampRow}>Visa path <b>—</b></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.kicker}>The first fork in the road</div>
        <h2 className={styles.h2}>Most people skip this question and regret it later.</h2>
        <div className={styles.paths}>
          <div className={styles.path}>
            <div className={styles.pathTag}>PATH A</div>
            <h3>Retire abroad</h3>
            <p>
              Lower cost of living, real cultural reinvention, and in some countries a genuinely
              favorable tax regime — at the cost of navigating a visa, foreign tax residency, and
              a healthcare system you didn&apos;t grow up with.
            </p>
            <Link href="/destinations?type=country" className={styles.pathLink}>
              See abroad destinations →
            </Link>
          </div>
          <div className={styles.path}>
            <div className={styles.pathTag}>PATH B</div>
            <h3>Stay in the U.S., relocate smart</h3>
            <p>
              Keep Medicare, the dollar, and zero foreign tax filings. Pick a no-income-tax state
              with the flight geography that matches how you actually want to travel.
            </p>
            <Link href="/destinations?type=state" className={styles.pathLink}>
              See U.S. state picks →
            </Link>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.calcTeaser}>
          <div className={styles.calcLeft}>
            <div className={styles.kicker}>Try it</div>
            <h3>Does your income actually cover the life you&apos;re picturing?</h3>
            <p>
              Enter your Social Security, pension, and withdrawals. Pick a destination. See the
              real monthly math — not a brochure estimate.
            </p>
          </div>
          <div className={styles.calcCard}>
            <div className={styles.calcRow}>Income <b>$2,700/mo</b></div>
            <div className={styles.calcRow}>Expenses + buffer <b>$2,180/mo</b></div>
            <div className={styles.calcRow}>Surplus <b>+$520/mo</b></div>
            <div className={styles.rating}>
              <span>Affordability</span>
              <span className={styles.pill}>COMFORTABLE</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.kicker}>Start exploring</div>
        <h2 className={styles.h2}>A mix of countries and U.S. states — one real comparison.</h2>
        <div className={styles.grid}>
          {GRID_DESTINATIONS.map((d, i) => {
            const photo = gridPhotos[i];
            return (
              <Link href={`/destinations/${d.slug}`} key={d.name} className={styles.card}>
                {photo ? (
                  <img src={photo.url} alt={photo.alt} className={styles.cardScene} />
                ) : (
                  <PlaceholderScene label={d.name} />
                )}
                <div className={styles.cardBody}>
                  <div className={styles.cardCoord}>{d.type === 'state' ? 'U.S. STATE' : 'COUNTRY'}</div>
                  <h4>{d.name}</h4>
                  {d.tag && <div className={styles.cardTag}>{d.tag}</div>}
                  <p>{d.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}
