// A visa-priority dimension specific to the /recommend tool. lib/matching.js
// (which powers the /match quiz) doesn't score visa fit directly, so this
// layers a bonus on top of its output instead of modifying the shared
// scoring logic used by the quiz. Uses `visaDifficulty` as a proxy for both
// "fastest/easiest" and "lowest requirement" — in the current data, easier
// visa programs (Panama, Costa Rica, Mexico) also tend to have the lowest
// income thresholds, so this holds up as a reasonable approximation without
// trying to parse free-text income-threshold strings into comparable numbers.

const VISA_DIFFICULTY_EASE = {
  Easy: 1,
  Moderate: 0.6,
  Complex: 0.3,
  'Very Complex': 0.15,
};

/**
 * Re-scores and re-sorts a list of already-matched destinations (from
 * matchDestinations()) based on the visitor's visa priority. No-op if the
 * visitor had no preference.
 */
export function applyVisaPriority(matches, visaPriority) {
  if (!visaPriority || visaPriority === 'no-preference') return matches;

  return matches
    .map((d) => {
      let bonus = 0;
      const ease = VISA_DIFFICULTY_EASE[d.visaDifficulty] ?? 0.4;

      if (visaPriority === 'fastest-easiest') {
        bonus = ease * 15;
      } else if (visaPriority === 'lowest-requirement') {
        bonus = ease * 10;
      } else if (visaPriority === 'path-to-residency') {
        const duration = `${d.visaDuration || ''}`.toLowerCase();
        if (duration.includes('permanent residency') || duration.includes('citizenship')) {
          bonus = 12;
        }
      }

      return { ...d, matchScore: Math.min(100, Math.round((d.matchScore || 0) + bonus)) };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
