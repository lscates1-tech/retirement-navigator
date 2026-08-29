/**
 * Federal default standard age curve for ACA individual-market rating.
 *
 * Source: CMS, "Market Rules and Rate Review" technical summary (subregulatory
 * guidance originally published 2013, still the default curve for the 48
 * jurisdictions that don't set their own state-specific curve — see
 * cms.gov/CCIIO/Programs-and-Initiatives/Health-Insurance-Market-Reforms/state-rating).
 * Ages 0–20 are rated as a single band at 0.635; ages 21–63 are one-year
 * bands; 64+ is a single band capped at 3.000 (the ACA's 3:1 age-rating limit).
 *
 * Every factor below is the multiple of the age-21 base rate charged at that
 * age. Storing one age-21 benchmark premium per metro (rather than a table
 * of overlapping age-band premiums) lets any household's estimate be derived
 * here, in one place, instead of duplicated per metro per age band.
 *
 * A handful of jurisdictions (NY, VT, DC use community rating; MA and NJ use
 * narrower state-specific curves) don't follow this curve exactly. v1 uses
 * the federal default everywhere and flags state-specific-curve locations as
 * a known simplification — see ACA_CURVE_EXCEPTIONS below.
 */

export const ACA_AGE_CURVE_2026 = {
  0: 0.635, 1: 0.635, 2: 0.635, 3: 0.635, 4: 0.635, 5: 0.635, 6: 0.635, 7: 0.635,
  8: 0.635, 9: 0.635, 10: 0.635, 11: 0.635, 12: 0.635, 13: 0.635, 14: 0.635,
  15: 0.635, 16: 0.635, 17: 0.635, 18: 0.635, 19: 0.635, 20: 0.635,
  21: 1.000, 22: 1.000, 23: 1.000, 24: 1.000, 25: 1.004, 26: 1.024, 27: 1.048,
  28: 1.087, 29: 1.119, 30: 1.135, 31: 1.159, 32: 1.183, 33: 1.198, 34: 1.214,
  35: 1.222, 36: 1.230, 37: 1.238, 38: 1.246, 39: 1.262, 40: 1.278, 41: 1.302,
  42: 1.325, 43: 1.357, 44: 1.397, 45: 1.444, 46: 1.500, 47: 1.563, 48: 1.635,
  49: 1.706, 50: 1.786, 51: 1.865, 52: 1.952, 53: 2.040, 54: 2.135, 55: 2.230,
  56: 2.333, 57: 2.437, 58: 2.548, 59: 2.603, 60: 2.714, 61: 2.810, 62: 2.873,
  63: 2.952,
  // 64 and older
  64: 3.000,
};

export const ACA_AGE_CURVE_META = {
  year: 2026,
  source: 'CMS Default Standard Age Curve (45 CFR 147.102), unchanged since 2013 guidance',
  lastVerified: '2026-08-24',
  confidence: 'high — federal regulatory default, applies in 48 of 51 rating jurisdictions',
};

// Jurisdictions known to deviate from the federal default curve as of 2026.
// v1 does not implement these alternate curves — metros in these states
// should carry a note in their ACA data pointing this out, and the
// generated estimate should be labeled accordingly rather than presented
// as precise. This list exists so the calculation layer (or a future
// contributor) can find the gap quickly rather than rediscovering it.
export const ACA_CURVE_EXCEPTIONS = {
  'New York': 'Community rated — premiums do not vary by age.',
  Vermont: 'Community rated — premiums do not vary by age.',
  'District of Columbia': 'Uses a DC-specific age curve, narrower than the federal default.',
  Massachusetts: 'Uses a state-specific curve (~1.637 ratio age 40→59) narrower than the federal default (~2.04).',
  'New Jersey': 'Uses a state-specific curve narrower than the federal default.',
};

/**
 * Estimate an individual's monthly ACA benchmark (2nd-lowest-cost Silver)
 * premium from a metro's stored age-21 base rate.
 *
 * @param {number} age
 * @param {number} age21BasePremium - the metro's stored ACA benchmark base rate
 * @returns {number} estimated monthly premium, rounded to the nearest dollar
 */
export function estimateAcaPremium(age, age21BasePremium) {
  if (!age21BasePremium || age21BasePremium <= 0) return 0;
  const clampedAge = Math.max(0, Math.min(64, Math.round(age)));
  const factor = ACA_AGE_CURVE_2026[clampedAge] ?? ACA_AGE_CURVE_2026[64];
  return Math.round(age21BasePremium * factor);
}
