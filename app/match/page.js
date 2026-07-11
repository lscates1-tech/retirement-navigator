import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getPublishedDestinations } from '@/lib/notion';
import { matchDestinations, getTaxPointers, determinePathway, PATHWAYS } from '@/lib/matching';
import styles from './match.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Find Your Fit — Which Path Fits You? | Next Horizon',
  description: 'Answer a few questions and find out which of five paths — retiring abroad, remote work, slow travel, tax-residency rotation, or a U.S. home base — actually fits your situation.',
};

const QUESTIONS = [
  {
    name: 'lifeStage',
    label: 'What stage of life are you in?',
    options: [
      ['', 'Select one'],
      ['retired', 'Retired'],
      ['semi-retired', 'Semi-retired / working part-time'],
      ['working', 'Still working full-time'],
    ],
  },
  {
    name: 'incomeSource',
    label: 'Where does most of your income come from?',
    options: [
      ['', 'Select one'],
      ['ss-pension', 'Social Security, pension, or retirement accounts'],
      ['active-work', 'Active W2 or 1099 work'],
      ['mix', 'A mix of both'],
    ],
  },
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
    name: 'homeBasePreference',
    label: 'Do you want to keep a U.S. home base?',
    options: [
      ['no-preference', 'No strong preference'],
      ['want-one', 'Yes, I want a home base to return to'],
      ['no-base', "No — I'd rather not be tied to one place"],
    ],
  },
  {
    name: 'pace',
    label: "What's your approach to relocating?",
    options: [
      ['unsure', 'Not sure yet'],
      ['settle', 'Settle in one place'],
      ['slow-travel', 'Test a place with slow travel first'],
      ['rotate', 'Rotate between countries to avoid tax residency anywhere'],
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
];

function ScoreBar({ score }) {
  return (
    <div className={styles.scoreBarTrack}>
      <div className={styles.scoreBarFill} style={{ width: `${score}%` }} />
    </div>
  );
}

export default async function MatchPage({ searchParams }) {
  const hasAnswers = Boolean(searchParams?.lifeStage);

  if (!hasAnswers) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <h1 className="display" style={{ fontSize: 32 }}>Find Your Fit</h1>
          <p className={styles.sub}>
            Answer a few questions — first we&apos;ll figure out which of the five paths on this site actually
            fits you, then match you against destinations within it. Instantly, using our own verified cost,
            tax, and healthcare data. No AI, no guesswork, no waiting.
          </p>

          <form method="GET" className={styles.form}>
            {QUESTIONS.map((q) => (
              <div key={q.name} className={styles.field}>
                <label className={styles.label} htmlFor={q.name}>{q.label}</label>
                <select id={q.name} name={q.name} required={q.name === 'lifeStage' || q.name === 'location'} className={styles.select} defaultValue="">
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
    lifeStage: searchParams.lifeStage || 'retired',
    incomeSource: searchParams.incomeSource || 'ss-pension',
    location: searchParams.location || 'either',
    homeBasePreference: searchParams.homeBasePreference || 'no-preference',
    pace: searchParams.pace || 'unsure',
    budget: searchParams.budget || '2500to4000',
    climate: searchParams.climate || 'no-preference',
    taxPriority: searchParams.taxPriority || 'matters',
    healthcarePriority: searchParams.healthcarePriority || 'fine',
    hasRetirementAccounts: searchParams.hasRetirementAccounts || 'no',
  };

  // Step 1: determine which of the five pathways actually fits, based on
  // life stage, income source, location preference, home base preference,
  // and pace. Step 2: match destinations within that pathway, by
  // overriding the location filter passed into the existing scoring logic
  // with the pathway's natural destination type — reusing the same
  // hard-exclude behavior already built for the raw location question.
  const pathwayKey = determinePathway(answers);
  const pathway = PATHWAYS[pathwayKey];
  const matchingAnswers = { ...answers, location: pathway.locationFilter };

  const published = (await getPublishedDestinations()) || [];
  const matches = matchDestinations(published, matchingAnswers, 5);
  const taxPointers = getTaxPointers(answers, matches, pathwayKey);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.pathwayCard}>
          <div className={styles.pathwayLabel}>Your path</div>
          <h1 className={styles.pathwayName}>{pathway.label}</h1>
          <p className={styles.pathwayDescription}>{pathway.description}</p>
        </div>

        <h2 className={styles.resultsHeading}>Top matches within this path</h2>
        <p className={styles.sub}>
          Ranked and scored transparently against our own cost, climate, tax, and healthcare data.
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
            <div className={styles.taxLabel}>Reading for your situation</div>
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
