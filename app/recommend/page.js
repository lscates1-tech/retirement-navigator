import { headers } from 'next/headers';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getPublishedDestinations } from '@/lib/notion';
import { COUNTRY_DEFAULTS } from '@/lib/destinationDefaults';
import { matchDestinations } from '@/lib/matching';
import { applyVisaPriority } from '@/lib/visaScoring';
import { generateRecommendation } from '@/lib/claudeClient';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp, hashIp } from '@/lib/hashIp';
import { logRecommendationEvent } from '@/lib/logger';
import styles from './recommend.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get a Destination Recommendation | Next Horizon',
  description:
    'Answer three quick questions about climate, budget, and visa priority — get one specific, written destination recommendation from Next Horizon.',
};

const CLIMATE_OPTIONS = [
  ['no-preference', 'No strong preference'],
  ['tropical', 'Warm & tropical'],
  ['mediterranean', 'Mediterranean, mild year-round'],
  ['four-seasons', 'Four distinct seasons'],
];

const BUDGET_OPTIONS = [
  ['under1500', 'Under $1,500/mo'],
  ['1500to2500', '$1,500 – $2,500/mo'],
  ['2500to4000', '$2,500 – $4,000/mo'],
  ['over4000', '$4,000+/mo'],
];

const VISA_OPTIONS = [
  ['no-preference', 'No strong preference'],
  ['fastest-easiest', 'Fastest, easiest to qualify'],
  ['path-to-residency', 'Path to residency or citizenship'],
  ['lowest-requirement', 'Lowest income/asset requirement'],
];

const MAX_NOTES_CHARS = 300;

function fallbackCountries() {
  return Object.entries(COUNTRY_DEFAULTS).map(([name, budgetDefaults]) => ({
    id: name,
    type: 'country',
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    budgetDefaults,
  }));
}

export default async function RecommendPage({ searchParams }) {
  const hasAnswers = Boolean(searchParams?.climate);

  if (!hasAnswers) {
    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Next Horizon</p>
          <h1 className={styles.title}>Where should you retire?</h1>
          <p className={styles.sub}>
            Three quick questions — climate, budget, and visa priority — and we&apos;ll write one specific
            recommendation, chosen from the countries that already score best against our own verified cost,
            tax, and visa data. This sits alongside the Find Your Fit quiz and budget calculator, not in
            place of them.
          </p>

          <form method="GET" className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="climate">Climate</label>
              <select id="climate" name="climate" required className={styles.select} defaultValue="">
                <option value="" disabled>Select one</option>
                {CLIMATE_OPTIONS.map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="budget">Monthly budget</label>
              <select id="budget" name="budget" required className={styles.select} defaultValue="">
                <option value="" disabled>Select one</option>
                {BUDGET_OPTIONS.map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="visaPriority">Visa priority</label>
              <select id="visaPriority" name="visaPriority" required className={styles.select} defaultValue="">
                <option value="" disabled>Select one</option>
                {VISA_OPTIONS.map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="notes">Anything else worth knowing? (optional)</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={MAX_NOTES_CHARS}
                className={styles.textarea}
                placeholder="e.g. near the coast, want strong healthcare access, prefer a smaller town"
              />
            </div>

            <button type="submit" className={styles.submitBtn}>Get My Recommendation</button>
          </form>
        </div>
        <Footer />
      </main>
    );
  }

  const answers = {
    climate: searchParams.climate || 'no-preference',
    budget: searchParams.budget || '2500to4000',
    visaPriority: searchParams.visaPriority || 'no-preference',
    notes: (searchParams.notes || '').toString().slice(0, MAX_NOTES_CHARS),
  };

  // Rate limit check first — before any matching or model work.
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const ipHash = hashIp(ip);
  const rateLimitResult = await checkRateLimit(ipHash);

  if (!rateLimitResult.allowed) {
    logRecommendationEvent({
      timestamp: new Date().toISOString(),
      ipHash,
      climate: answers.climate,
      budget: answers.budget,
      visaPriority: answers.visaPriority,
      hadNotes: Boolean(answers.notes),
      shortlistCount: 0,
      topDestinationId: null,
      outputTokens: null,
      latencyMs: 0,
      status: 'rate_limited',
    });

    return (
      <main id="main-content">
        <Nav />
        <div className={styles.wrap}>
          <p className={styles.errorBox}>
            {rateLimitResult.reason === 'session_limit'
              ? "You've reached today's limit for this tool. Please try again tomorrow."
              : "You've reached the hourly limit for recommendations. Please try again in a bit."}
          </p>
          <Link href="/recommend" className={styles.retakeLink}>← Try again</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const startedAt = Date.now();

  // Live Notion data, filtered to countries, falling back to verified
  // defaults if Notion isn't configured or returns nothing — same pattern
  // as the calculator page.
  const notionAll = await getPublishedDestinations();
  const liveCountries = notionAll ? notionAll.filter((d) => d.type === 'country') : [];
  const countries = liveCountries.length ? liveCountries : fallbackCountries();

  // Reuse the same weighted matching engine that powers /match. This tool
  // only covers countries (visa priority isn't a meaningful axis for US
  // states), so location is fixed to 'abroad' rather than asked as a
  // question.
  const matchingAnswers = {
    lifeStage: 'retired',
    incomeSource: 'ss-pension',
    location: 'abroad',
    homeBasePreference: 'no-preference',
    pace: 'unsure',
    budget: answers.budget,
    climate: answers.climate,
    taxPriority: 'matters',
    healthcarePriority: 'fine',
    hasRetirementAccounts: 'no',
  };

  const baseMatches = matchDestinations(countries, matchingAnswers, 10);
  const shortlist = applyVisaPriority(baseMatches, answers.visaPriority).slice(0, 8);

  let recommendationText = null;
  let generationError = null;

  try {
    const { text, outputTokens } = await generateRecommendation(answers, shortlist);
    recommendationText = text;
    logRecommendationEvent({
      timestamp: new Date().toISOString(),
      ipHash,
      climate: answers.climate,
      budget: answers.budget,
      visaPriority: answers.visaPriority,
      hadNotes: Boolean(answers.notes),
      shortlistCount: shortlist.length,
      topDestinationId: shortlist[0]?.id ?? null,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      status: 'success',
    });
  } catch (err) {
    console.error('[recommend] generation failed', err);
    generationError = 'Something went wrong generating your recommendation. Please try again.';
    logRecommendationEvent({
      timestamp: new Date().toISOString(),
      ipHash,
      climate: answers.climate,
      budget: answers.budget,
      visaPriority: answers.visaPriority,
      hadNotes: Boolean(answers.notes),
      shortlistCount: shortlist.length,
      topDestinationId: shortlist[0]?.id ?? null,
      outputTokens: null,
      latencyMs: Date.now() - startedAt,
      status: 'error',
    });
  }

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon</p>
        <h1 className={styles.title}>Your recommendation</h1>

        {generationError ? (
          <p className={styles.errorBox}>{generationError}</p>
        ) : (
          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Best fit</div>
            <p className={styles.resultText}>{recommendationText}</p>
          </div>
        )}

        {shortlist.length > 0 && (
          <p className={styles.sub}>Weighed against: {shortlist.map((d) => d.name).join(', ')}</p>
        )}

        <div className={styles.actionsRow}>
          <Link href="/recommend" className={styles.retakeLink}>← Ask again with different answers</Link>
          <Link href="/match" className={styles.calcCta}>Take the full Find Your Fit quiz →</Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
