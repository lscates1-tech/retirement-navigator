import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getPublishedDestinations } from '@/lib/notion';
import { matchDestinations, getTaxPointers } from '@/lib/matching';
import styles from './match.module.css';

export const dynamic = 'force-dynamic';

const QUESTIONS = [
  {
    name: 'location',
    label: 'Where do you want to live?',
    options: [
      ['', 'Select one'],
      ['us', 'Stay in the U.S.'],
      ['abroad', 'Move abroad'],
      ['either', 'Open to either'],
    ],
  },
  {
    name: 'budget',
    label: 'Monthly budget, excluding rent',
    options: [
      ['', 'Select one'],
      ['under1500', 'Under $1,500'],
      ['1500to2500', '$1,500 – $2,500'],
      ['2500to4000', '$2,500 – $4,000'],
      ['over4000', '$4,000+'],
    ],
  },
  {
    name: 'climate',
    label: 'Climate preference',
    options: [
      ['no-preference', 'No preference'],
      ['tropical', 'Tropical / warm year-round'],
      ['mediterranean', 'Mediterranean / mild four seasons'],
      ['four-seasons', 'Four seasons / some winter'],
      ['cold', "I like real winters, don't move me somewhere hot"],
    ],
  },
  {
    name: 'taxPriority',
    label: 'How important is minimizing taxes?',
    options: [
      ['critical', 'Critical — no income tax / territorial system is a must'],
      ['matters', 'Matters, but not the top priority'],
      ['minor', 'Not a major factor for me'],
    ],
  },
  {
    name: 'healthcarePriority',
    label: 'How important is top-tier healthcare access?',
    options: [
      ['essential', 'Essential — I want excellent hospitals nearby'],
      ['fine', 'Good-enough healthcare is fine'],
      ['minor', 'Not a major concern'],
    ],
  },
  {
    name: 'hasRetirementAccounts',
    label: 'Do you have a Roth IRA, 401(k), or other retirement accounts you want to protect?',
    options: [
      ['no', 'No / not significant'],
      ['yes', 'Yes'],
    ],
  },
  {
    name: 'pace',
    label: "What's your approach to relocating?",
    options: [
      ['settle', 'Settle in one place'],
      ['slow-travel', 'Test a place with slow travel first'],
      ['rotate', 'Rotate between countries to avoid tax residency anywhere'],
      ['unsure', 'Not sure yet'],
    ],
  },
];

function ScoreBar({ score }) {
  return (
    <div className={styles.scoreBarTrack}>
      <div className={styles.scoreBarFill} style={{ width: `${score}%` }} />
    </div>
  );
}

export default async function MatchPage({ searchParams }) {
  const hasAnswers = Boolean(searchParams?.location);

  if (!hasAnswers) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 32 }}>Find Your Fit</h1>
          <p className={styles.sub}>
            Answer a few questions and we&apos;ll match you against every destination on this site — instantly,
            using our own verified cost, tax, and healthcare data. No AI, no guesswork, no waiting.
          </p>

          <form method="GET" className={styles.form}>
            {QUESTIONS.map((q) => (
              <div key={q.name} className={styles.field}>
                <label className={styles.label} htmlFor={q.name}>{q.label}</label>
                <select id={q.name} name={q.name} required={q.name === 'location' || q.name === 'budget'} className={styles.select} defaultValue="">
                  {q.options.map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
              </div>
            ))}
            <button type="submit" className={styles.submitBtn}>Show My Matches</button>
          </form>
        </div>
        <Footer />
      </main>
    );
  }

  const answers = {
    location: searchParams.location || 'either',
    budget: searchParams.budget || '2500to4000',
    climate: searchParams.climate || 'no-preference',
    taxPriority: searchParams.taxPriority || 'matters',
    healthcarePriority: searchParams.healthcarePriority || 'fine',
    hasRetirementAccounts: searchParams.hasRetirementAccounts || 'no',
    pace: searchParams.pace || 'unsure',
  };

  const published = (await getPublishedDestinations()) || [];
  const matches = matchDestinations(published, answers, 5);
  const taxPointers = getTaxPointers(answers, matches);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <h1 className="display" style={{ fontSize: 32 }}>Your Top Matches</h1>
        <p className={styles.sub}>
          Based on your answers, here are the destinations on this site that fit best — ranked and scored
          transparently against our own cost, climate, tax, and healthcare data.
        </p>

        {matches.length === 0 ? (
          <p className={styles.empty}>No matches found — try adjusting your answers.</p>
        ) : (
          <div className={styles.results}>
            {matches.map((d, i) => (
              <div key={d.id} className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <div className={styles.rank}>#{i + 1}</div>
                  <div className={styles.resultTitleBlock}>
                    <div className={styles.resultType}>{d.type === 'country' ? 'Country' : 'U.S. State'}</div>
                    <h2 className={styles.resultName}>
                      <Link href={`/destinations/${d.slug}`}>{d.name}</Link>
                    </h2>
                  </div>
                  <div className={styles.scoreBlock}>
                    <div className={styles.scoreNumber}>{d.matchScore}%</div>
                    <ScoreBar score={d.matchScore} />
                  </div>
                </div>
                <p className={styles.resultSummary}>{d.summary}</p>
              </div>
            ))}
          </div>
        )}

        {taxPointers.length > 0 && (
          <div className={styles.taxSection}>
            <div className={styles.taxLabel}>Tax strategy reading for your situation</div>
            <ul className={styles.taxList}>
              {taxPointers.map((p, i) => (
                <li key={i}>
                  <Link href={p.href} className={styles.taxLink}>{p.label} →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actionsRow}>
          <Link href="/match" className={styles.retakeLink}>← Retake the quiz</Link>
          <Link href="/calculator" className={styles.calcCta}>Run the full budget calculator →</Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
