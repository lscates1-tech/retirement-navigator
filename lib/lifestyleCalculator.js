/**
 * Lifestyle Calculator — core calculation engine.
 *
 * Deliberately framework-agnostic (no React, no Next.js imports) so it can
 * be unit tested directly and reused if the calculator logic is ever needed
 * server-side (e.g. for a future API route) as well as client-side.
 *
 * Philosophy, matching lib/matching.js elsewhere in this codebase: every
 * score is a transparent, explainable sum of named factors — no black box,
 * no LLM call in the scoring path itself.
 */

import { MEDICARE_2026 } from './lifestyleMedicare2026.js';
import { estimateAcaPremium } from './lifestyleAcaAgeCurve2026.js';
import { STATE_TAX_2026 } from './lifestyleStateTax2026.js';

// ---------------------------------------------------------------------
// Household & phase modeling
// ---------------------------------------------------------------------

const MEDICARE_ELIGIBLE_AGE = 65;

/**
 * A person's income/coverage picture, expressed per-phase from the start,
 * rather than inferred — the wizard is responsible for asking "what will
 * this look like now vs. later," this function just consumes the answer.
 *
 * @typedef {Object} PersonInput
 * @property {number} age
 * @property {{phase1: number, phase2: number}} socialSecurity
 * @property {{phase1: number, phase2: number}} pension
 * @property {{phase1: number, phase2: number}} iraWithdrawal
 * @property {{phase1: number, phase2: number}} employment
 * @property {{phase1: number, phase2: number}} other
 * @property {'medicare'|'medicare-medigap-partd'|'medicare-advantage'|'aca'|'private'|'employer'|'actual'} coveragePhase1
 * @property {'medicare'|'medicare-medigap-partd'|'medicare-advantage'|'aca'|'private'|'employer'|'actual'} coveragePhase2
 * @property {number} [actualMonthlyPremiumOverride]
 */

/**
 * Determine the bridge-period length (years until the younger person turns
 * 65) and each person's Medicare-eligibility status per phase. A
 * single-Medicare-eligible household (or a household where both are
 * already 65+) has a zero-length phase1 — phase1 and phase2 collapse into
 * one steady-state phase, which downstream functions handle by just
 * returning identical figures for both without any special-casing.
 */
export function buildHouseholdPhases(people) {
  const ages = people.map((p) => p.age);
  const youngestAge = Math.min(...ages);
  const yearsUntilBothMedicare = Math.max(0, MEDICARE_ELIGIBLE_AGE - youngestAge);

  return {
    hasBridgePeriod: yearsUntilBothMedicare > 0,
    bridgeYears: yearsUntilBothMedicare,
    phase1Label: yearsUntilBothMedicare > 0
      ? `Bridge period (next ${yearsUntilBothMedicare} year${yearsUntilBothMedicare === 1 ? '' : 's'})`
      : 'Current',
    phase2Label: yearsUntilBothMedicare > 0 ? 'Once both are on Medicare' : 'Current',
    people: people.map((p) => ({
      ...p,
      medicareEligiblePhase1: p.age >= MEDICARE_ELIGIBLE_AGE,
      medicareEligiblePhase2: true, // by definition of phase 2
    })),
  };
}

// ---------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------

function sumStream(people, streamKey, phase) {
  return people.reduce((sum, p) => sum + (Number(p[streamKey]?.[phase]) || 0), 0);
}

/**
 * @returns {{
 *   phase1: {nonIraMonthly:number, iraMonthly:number, socialSecurityMonthly:number, otherNonIraMonthly:number, totalMonthly:number, totalAnnual:number},
 *   phase2: {nonIraMonthly:number, iraMonthly:number, socialSecurityMonthly:number, otherNonIraMonthly:number, totalMonthly:number, totalAnnual:number}
 * }}
 */
export function calcIncome(people) {
  const build = (phase) => {
    const socialSecurityMonthly = sumStream(people, 'socialSecurity', phase);
    const otherNonIraMonthly = ['pension', 'employment', 'other'].reduce((sum, key) => sum + sumStream(people, key, phase), 0);
    const nonIraMonthly = socialSecurityMonthly + otherNonIraMonthly;
    const iraMonthly = sumStream(people, 'iraWithdrawal', phase);
    const totalMonthly = nonIraMonthly + iraMonthly;
    return {
      nonIraMonthly, iraMonthly, socialSecurityMonthly, otherNonIraMonthly,
      totalMonthly, totalAnnual: totalMonthly * 12,
    };
  };
  return { phase1: build('phase1'), phase2: build('phase2') };
}

// ---------------------------------------------------------------------
// Home equity (kept fully separate from monthly cash flow, per spec)
// ---------------------------------------------------------------------

/**
 * @param {Object} homeInputs
 * @param {boolean} homeInputs.owns
 * @param {boolean} [homeInputs.paidOff]
 * @param {number} [homeInputs.currentValueLow]
 * @param {number} [homeInputs.currentValueHigh]
 * @param {number} [homeInputs.sellingCostPct] - decimal, e.g. 0.07
 * @param {number} [homeInputs.additionalCashAvailable] - extra cash the household is willing to add
 * @param {Object} metro
 * @returns {Object|null} null if the household is renting (no equity math applies)
 */
export function calcHomeEquity(homeInputs, metro) {
  if (!homeInputs?.owns) return null;

  const sellingCostPct = homeInputs.sellingCostPct ?? 0.07;
  const valueLow = Number(homeInputs.currentValueLow) || 0;
  const valueHigh = Number(homeInputs.currentValueHigh) || valueLow;

  const netProceedsLow = Math.round(valueLow * (1 - sellingCostPct));
  const netProceedsHigh = Math.round(valueHigh * (1 - sellingCostPct));

  const replacementCost = metro.housing.typicalHomeValue;
  const availableCash = netProceedsLow + (Number(homeInputs.additionalCashAvailable) || 0);

  const equityDelta = availableCash - replacementCost; // + = released, - = additional cash needed

  return {
    netProceedsLow,
    netProceedsHigh,
    replacementCost,
    additionalCashAvailable: Number(homeInputs.additionalCashAvailable) || 0,
    equityReleased: equityDelta > 0 ? equityDelta : 0,
    additionalCashNeeded: equityDelta < 0 ? -equityDelta : 0,
  };
}

// ---------------------------------------------------------------------
// Healthcare
// ---------------------------------------------------------------------

/**
 * Estimate a household's IRMAA-relevant MAGI for a given phase.
 *
 * Real MAGI = AGI + tax-exempt interest + excluded foreign income, and real
 * IRMAA uses a 2-year lookback (2026 premiums are based on 2024 MAGI) — a
 * forward-looking relocation-planning tool has neither piece of data, so
 * two deliberate simplifications are made, both documented here rather
 * than silently baked in:
 *
 *   1. LOOKBACK: uses the phase's *projected* income as a stand-in for the
 *      actual 2-years-prior figure IRMAA would really use. This is the
 *      only practical choice for planning a future move, but means the
 *      estimate answers "what would IRMAA cost at this income level,"
 *      not "what will my 2028 premium actually be."
 *   2. SOCIAL SECURITY TAXABILITY: only up to 85% of Social Security is
 *      ever included in MAGI, determined by a separate "combined income"
 *      formula. Rather than implement that formula, this uses a flat 85%
 *      — which is a close approximation specifically because IRMAA only
 *      matters at income levels well above the thresholds where 85% of
 *      SS is taxable anyway, so the flat rate rarely diverges from the
 *      real formula in the income range where it changes the answer.
 *
 * @returns {number} estimated annual MAGI
 */
export function estimateMagiForIrmaa(incomePhase) {
  const annualNonSs = (incomePhase.otherNonIraMonthly + incomePhase.iraMonthly) * 12;
  const annualTaxableSs = incomePhase.socialSecurityMonthly * 12 * 0.85;
  return Math.round(annualNonSs + annualTaxableSs);
}

/**
 * Look up the IRMAA-adjusted Part B premium and Part D surcharge for a
 * household's estimated MAGI and filing status. IRMAA is a cliff, not a
 * phase-in — crossing a threshold by $1 triggers the full next tier.
 *
 * @param {number} magiAnnual
 * @param {'single'|'married'} filingStatus
 * @returns {{partBMonthly: number, partDAdjustment: number, bracketIndex: number}}
 */
export function lookupIrmaaBracket(magiAnnual, filingStatus) {
  const brackets = filingStatus === 'married'
    ? MEDICARE_2026.irmaaBrackets2026MarriedJoint
    : MEDICARE_2026.irmaaBrackets2026Individual;
  const index = brackets.findIndex((b) => magiAnnual <= b.magiUpTo);
  const bracket = brackets[index === -1 ? brackets.length - 1 : index];
  return { partBMonthly: bracket.partBMonthly, partDAdjustment: bracket.partDAdjustment, bracketIndex: index };
}

/**
 * Cost for a single person under a single coverage choice, for a metro, at
 * a given age. Returns 0 for 'employer' (assumed covered) and passes
 * through 'actual' overrides untouched. Returns a full breakdown, not just
 * a total, so the wizard and results can show what's actually assumed
 * rather than a single opaque number.
 *
 * @param {Object} irmaa - { partBMonthly, partDAdjustment } from lookupIrmaaBracket(),
 *   or null to use the standard (non-IRMAA) Part B premium
 * @returns {{ total: number, breakdown: Array<{label: string, amount: number}> }}
 */
function personHealthcareCost(person, metro, coverageKey, overrideAmount, irmaa) {
  if (coverageKey === 'actual' && overrideAmount != null) {
    const amount = Number(overrideAmount) || 0;
    return { total: amount, breakdown: [{ label: 'Your actual premium', amount }] };
  }
  if (coverageKey === 'employer') {
    return { total: 0, breakdown: [{ label: 'Employer plan', amount: 0 }] };
  }

  const hc = metro.healthcare;
  const fallback = MEDICARE_2026.nationalFallback;
  const partB = irmaa ? irmaa.partBMonthly : MEDICARE_2026.partBStandardMonthlyPremium;
  const partBLabel = irmaa && irmaa.bracketIndex > 0 ? 'Part B (IRMAA-adjusted)' : 'Part B';

  switch (coverageKey) {
    case 'medicare-medigap-partd': {
      const medigap = hc.medigapMonthlyEstimate ?? fallback.medigapPlanGMonthlyEstimate;
      const partD = (hc.partDMonthlyEstimate ?? fallback.standalonePartDMonthlyEstimate) + (irmaa?.partDAdjustment || 0);
      const breakdown = [
        { label: partBLabel, amount: partB },
        { label: 'Medigap (Plan G estimate)', amount: medigap },
        { label: irmaa?.partDAdjustment ? 'Part D (incl. IRMAA)' : 'Part D', amount: Math.round(partD * 100) / 100 },
      ];
      return { total: breakdown.reduce((s, b) => s + b.amount, 0), breakdown };
    }
    case 'medicare-advantage': {
      const ma = hc.medicareAdvantageMonthlyEstimate ?? fallback.medicareAdvantageMonthlyEstimate;
      const partDAdj = irmaa?.partDAdjustment || 0;
      const breakdown = [
        { label: partBLabel, amount: partB },
        { label: 'Medicare Advantage plan', amount: ma },
      ];
      if (partDAdj) breakdown.push({ label: 'Part D IRMAA surcharge', amount: Math.round(partDAdj * 100) / 100 });
      return { total: breakdown.reduce((s, b) => s + b.amount, 0), breakdown };
    }
    case 'medicare': {
      // Part B only — used when the person hasn't specified a supplement
      // strategy yet; likely to understate real cost, so callers should
      // prefer the two options above once known.
      const breakdown = [{ label: partBLabel, amount: partB }];
      return { total: partB, breakdown };
    }
    case 'aca':
    case 'private': {
      const amount = estimateAcaPremium(person.age, hc.acaBenchmarkPremiumAge21);
      return { total: amount, breakdown: [{ label: 'ACA benchmark premium (unsubsidized)', amount }] };
    }
    default:
      return { total: 0, breakdown: [] };
  }
}

/**
 * @param {Object} incomePhase - the SAME phase's income object from
 *   calcIncome(), used to estimate household MAGI for IRMAA. Passing the
 *   matching phase's income (not total household income across phases)
 *   matters because a mixed-age household's income — and therefore IRMAA
 *   exposure — genuinely differs between the bridge period and steady state.
 * @param {number} householdSize - used to select individual vs. married IRMAA brackets
 * @returns {{ perPerson: Array<{name:string, monthly:number, breakdown: Array}>, totalMonthly:number, magiAnnual: number, irmaaBracketIndex: number }}
 */
export function calcHealthcareCost(people, metro, phase, incomePhase) {
  const coverageField = phase === 'phase1' ? 'coveragePhase1' : 'coveragePhase2';
  const overrideField = phase === 'phase1' ? 'actualPremiumOverridePhase1' : 'actualPremiumOverridePhase2';

  const magiAnnual = incomePhase ? estimateMagiForIrmaa(incomePhase) : 0;
  const filingStatus = people.length >= 2 ? 'married' : 'single';
  const irmaa = incomePhase ? lookupIrmaaBracket(magiAnnual, filingStatus) : null;

  const perPerson = people.map((p, i) => {
    // IRMAA only applies to Medicare enrollees, not ACA/private/employer
    const coverageKey = p[coverageField];
    const isMedicare = coverageKey === 'medicare-medigap-partd' || coverageKey === 'medicare-advantage' || coverageKey === 'medicare';
    const result = personHealthcareCost(p, metro, coverageKey, p[overrideField], isMedicare ? irmaa : null);
    return { name: p.name || `Person ${i + 1}`, monthly: Math.round(result.total), breakdown: result.breakdown };
  });

  return {
    perPerson,
    totalMonthly: perPerson.reduce((sum, p) => sum + p.monthly, 0),
    magiAnnual,
    irmaaBracketIndex: irmaa?.bracketIndex ?? 0,
  };
}

// ---------------------------------------------------------------------
// State income tax (retirement-income-focused)
// ---------------------------------------------------------------------

/**
 * Estimate a household's state income tax burden for a given phase,
 * focused specifically on how the state treats retirement income (Social
 * Security, pension, IRA/401(k) withdrawals) rather than a generic "has
 * income tax" comparison — see lifestyleStateTax2026.js for why that
 * distinction matters for this audience.
 *
 * @param {Array} people
 * @param {'phase1'|'phase2'} phase
 * @param {Object} metro
 * @returns {{ monthlyTax: number, annualTax: number, breakdown: Array<{label:string, amount:number}>, state: string }}
 */
export function calcStateTax(people, phase, metro) {
  const state = metro.state;
  const entry = STATE_TAX_2026[state];

  if (!entry || !entry.hasIncomeTax) {
    return { monthlyTax: 0, annualTax: 0, state, breakdown: [{ label: `${state} has no state income tax`, amount: 0 }] };
  }

  const sum = (key) => people.reduce((s, p) => s + (Number(p[key]?.[phase]) || 0), 0);
  const annualSS = sum('socialSecurity') * 12;
  const annualPensionAndIra = (sum('pension') + sum('iraWithdrawal')) * 12;
  const annualOther = (sum('employment') + sum('other')) * 12;

  const filingStatus = people.length >= 2 ? 'married' : 'single';
  const youngestAge = Math.min(...people.map((p) => p.age));

  // Social Security taxability
  let taxableSs = 0;
  let ssNote = '';
  if (entry.ssTaxable === 'exempt') {
    ssNote = 'Social Security exempt';
  } else if (entry.ssTaxable === 'age-based-65-exempt') {
    if (youngestAge >= 65) {
      ssNote = 'Social Security exempt (65+)';
    } else {
      taxableSs = annualSS;
      ssNote = 'Social Security taxable (household includes someone under 65)';
    }
  } else if (entry.ssTaxable === 'income-threshold') {
    const threshold = filingStatus === 'married' ? entry.ssExemptionThresholdMarried : entry.ssExemptionThresholdSingle;
    const totalAnnualIncome = annualSS + annualPensionAndIra + annualOther;
    if (totalAnnualIncome <= threshold) {
      ssNote = `Social Security exempt (household income below the ${filingStatus === 'married' ? 'married' : 'single'} threshold)`;
    } else {
      taxableSs = annualSS;
      ssNote = 'Social Security taxable (household income above the exemption threshold)';
    }
  }

  const retirementExemption = filingStatus === 'married' ? entry.retirementIncomeExemptionMarriedAnnual : entry.retirementIncomeExemptionSingleAnnual;
  const taxableRetirement = Math.max(0, annualPensionAndIra - retirementExemption);
  const taxableOther = annualOther;

  const totalTaxable = taxableSs + taxableRetirement + taxableOther;
  const annualTax = totalTaxable * entry.effectiveRate;
  const monthlyTax = annualTax / 12;

  const breakdown = [];
  if (taxableSs > 0) breakdown.push({ label: `Social Security (taxable — ${state})`, amount: Math.round((taxableSs * entry.effectiveRate) / 12) });
  else breakdown.push({ label: ssNote, amount: 0 });
  if (annualPensionAndIra > 0) {
    breakdown.push({
      label: taxableRetirement > 0 ? 'Pension/IRA (above exemption)' : 'Pension/IRA (fully within exemption)',
      amount: Math.round((taxableRetirement * entry.effectiveRate) / 12),
    });
  }
  if (annualOther > 0) {
    breakdown.push({ label: 'Employment/other income', amount: Math.round((taxableOther * entry.effectiveRate) / 12) });
  }

  return { monthlyTax: Math.round(monthlyTax), annualTax: Math.round(annualTax), state, breakdown };
}

// ---------------------------------------------------------------------
// Living costs (housing carrying cost + core monthly categories)
// ---------------------------------------------------------------------

/**
 * @param {Object} metro
 * @param {Object} homeInputs
 * @param {boolean} homeInputs.owns
 * @param {number} householdSize - 1 or 2, scales variable categories
 */
export function calcLivingCosts(metro, homeInputs, householdSize = 1) {
  const scale = householdSize >= 2 ? 1.5 : 1; // living-cost categories scale sub-linearly for a couple

  let housing;
  if (homeInputs?.owns) {
    const propertyTax = Math.round((metro.housing.typicalHomeValue * metro.housing.propertyTaxRate) / 12);
    const maintenance = Math.round((metro.housing.typicalHomeValue * metro.housing.homeMaintenancePctAnnual) / 12);
    const insurance = Math.round(metro.housing.homeownersInsuranceAnnual / 12);
    housing = { propertyTax, maintenance, insurance, mortgage: 0, rent: 0, subtotal: propertyTax + maintenance + insurance };
  } else {
    const rent = metro.housing.typicalRent2BR;
    housing = { propertyTax: 0, maintenance: 0, insurance: 0, mortgage: 0, rent, subtotal: rent };
  }

  const autoInsuranceMonthly = Math.round(metro.autoInsuranceAnnual / 12);
  const living = {
    utilities: Math.round(metro.living.utilities * scale),
    groceries: Math.round(metro.living.groceries * scale),
    transportation: Math.round(metro.living.transportation * scale),
    autoInsurance: Math.round(autoInsuranceMonthly * (householdSize >= 2 ? 1.3 : 1)),
  };
  const livingSubtotal = living.utilities + living.groceries + living.transportation + living.autoInsurance;

  return {
    housing,
    living,
    totalMonthly: housing.subtotal + livingSubtotal,
  };
}

// ---------------------------------------------------------------------
// Surplus / required or reducible IRA withdrawal
// ---------------------------------------------------------------------

export function calcSurplus(incomePhase, expensesTotal) {
  const surplus = incomePhase.totalMonthly - expensesTotal;
  const surplusPercentage = incomePhase.totalMonthly ? (surplus / incomePhase.totalMonthly) * 100 : 0;
  const requiredIraToBalance = Math.max(0, expensesTotal - incomePhase.nonIraMonthly);
  const delta = incomePhase.iraMonthly - requiredIraToBalance;

  return {
    monthlySurplus: surplus,
    annualSurplus: surplus * 12,
    surplusPercentage: Math.round(surplusPercentage * 10) / 10, // one decimal
    requiredAdditionalWithdrawal: delta < 0 ? Math.round(-delta) : 0,
    potentialWithdrawalReduction: delta > 0 ? Math.round(delta) : 0,
    // MAGI-relevant income breakdown, preserved (not collapsed) so a future
    // ACA subsidy engine can compute actual MAGI without re-deriving these
    // from scratch. v1 does NOT sum these into a MAGI total — Social
    // Security is only partially countable (roughly 50-85% depending on
    // total income) and that threshold logic isn't implemented yet, so any
    // "MAGI total" this function produced today would be misleadingly
    // precise. Components only, until that logic exists.
    magiComponents: {
      taxableIraWithdrawals: incomePhase.iraMonthly,
      otherNonSsIncome: incomePhase.otherNonIraMonthly, // pension + employment + other
      socialSecurityMonthly: incomePhase.socialSecurityMonthly, // only partially MAGI-countable — not summed in below
      note: 'Social Security is only partially MAGI-countable (roughly 50-85% depending on total income); not summed into a MAGI total here. See comment above.',
    },
  };
}

// ---------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------

/**
 * Absolute-banded Financial Fit score (0-100). Deliberately NOT normalized
 * against whatever else is in the comparison set, so a location's score
 * means the same thing whether it's compared against 2 metros or 20.
 *
 * Piecewise-continuous curve over surplus-as-%-of-income, calibrated so
 * 100 represents genuinely exceptional margin rather than being reachable
 * by an ordinarily-comfortable household. Continuous WITHIN each band
 * (no flat step-function scoring), with one deliberate small step at the
 * 0% line — moving from any shortfall into any surplus is treated as a
 * meaningfully different financial situation, not a smooth gradient.
 *
 *   surplus % of income     Financial Fit
 *   ------------------      -------------
 *   < 0%   (shortfall)      0–39   (floor at -20% shortfall = 0)
 *   0–5%                    40–54
 *   5–10%                   55–64
 *   10–20%                  65–79
 *   20–30%                  80–89
 *   30–40%                  90–97
 *   40%+                    98–100 (asymptotic; 100% surplus-to-income ≈ 100)
 */
function lerp(x, x0, x1, y0, y1) {
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return y0 + t * (y1 - y0);
}

const FINANCIAL_FIT_BANDS = [
  // [pctLow, pctHigh, scoreLow, scoreHigh]
  [-20, 0, 0, 39],
  [0, 5, 40, 54],
  [5, 10, 55, 64],
  [10, 20, 65, 79],
  [20, 30, 80, 89],
  [30, 40, 90, 97],
  [40, 100, 98, 100],
];

export function financialFitScore(monthlySurplus, totalMonthlyIncome) {
  if (!totalMonthlyIncome) return 40;
  const pct = (monthlySurplus / totalMonthlyIncome) * 100;
  const clampedPct = Math.max(-20, Math.min(100, pct));
  const band = FINANCIAL_FIT_BANDS.find(([lo, hi]) => clampedPct >= lo && clampedPct <= hi)
    ?? FINANCIAL_FIT_BANDS[clampedPct < 0 ? 0 : FINANCIAL_FIT_BANDS.length - 1];
  return Math.round(lerp(clampedPct, band[0], band[1], band[2], band[3]));
}

const QUALITY_SCORE_MAP = { excellent: 92, good: 72, limited: 40 };
const IMPORTANCE_VALUES = { not: 1, somewhat: 2, important: 3, very: 4 };

// ---------------------------------------------------------------------
// Travel / airport scoring
//
// Three concepts are deliberately kept separate in the data, per the
// airport/travel research pass, rather than collapsed into one boolean:
//   1. Local airport access — how convenient the home airport itself is
//      (metro.travel.airportConnectivityScore: drive time, size, domestic
//      hub reach — does NOT itself encode international route quality)
//   2. Europe route usefulness (metro.travel.europeConnectivityScore)
//   3. South America route usefulness (metro.travel.southAmericaConnectivityScore)
// Each is stored per-metro and verified/estimated independently — see
// lib/lifestyleMetroDefaults.js sources.travel for per-metro confidence.
// The composite Travel Fit below combines them; europeFit and
// southAmericaFit are also returned unaggregated so a future UI can let a
// user weight "Europe matters to me" without assuming South America
// matters equally (not wired into weighting yet — see resolveWeights()).
// ---------------------------------------------------------------------
export function travelFitScore(metro, travelPreferences) {
  const localAirport = metro.travel.airportConnectivityScore ?? 40;
  const europeFit = metro.travel.europeConnectivityScore ?? 0;
  const southAmericaFit = metro.travel.southAmericaConnectivityScore ?? 0;

  // Local airport access is a fixed 40% of the composite — it matters
  // for every trip, not just international ones. The remaining 60% splits
  // between Europe and South America in proportion to how much the person
  // said each one matters (Step 5's travelToEurope / travelToSouthAmerica
  // answers) — this is what makes the two travel personas actually
  // diverge instead of averaging to the same number. Without an explicit
  // preference, split evenly (mirrors DEFAULT_CLIMATE_PREFERENCES' role
  // for climate: a neutral fallback, not an assumption about the average
  // user).
  const europeImportance = IMPORTANCE_VALUES[travelPreferences?.travelToEurope] ?? IMPORTANCE_VALUES.somewhat;
  const southAmericaImportance = IMPORTANCE_VALUES[travelPreferences?.travelToSouthAmerica] ?? IMPORTANCE_VALUES.somewhat;
  const directionTotal = europeImportance + southAmericaImportance;
  const europeShare = directionTotal ? europeImportance / directionTotal : 0.5;
  const southAmericaShare = directionTotal ? southAmericaImportance / directionTotal : 0.5;

  const composite = Math.round(Math.min(100,
    localAirport * 0.40 + europeFit * (0.60 * europeShare) + southAmericaFit * (0.60 * southAmericaShare)));

  return { composite, europeFit, southAmericaFit };
}

// ---------------------------------------------------------------------
// Climate preference-direction scoring
//
// Climate IMPORTANCE (how much someone cares) is handled separately, in
// resolveWeights() — it controls how much the climate component
// contributes to Overall Fit. This section handles climate FIT (whether a
// given metro's actual climate matches what someone wants), which is a
// completely different question and needs the person's preferred
// direction on four independent axes, not just an importance rating.
//
// Each axis maps a preference option to an "ideal" point on the metro's
// 1-5 scale and a penalty slope; score = 100 minus slope * distance from
// ideal, clamped to [0,100]. A flatter slope means a more tolerant
// preference (e.g. "snow/cold doesn't bother me" barely penalizes any
// winter severity); a steeper slope means a pickier preference.
// ---------------------------------------------------------------------

export const DEFAULT_CLIMATE_PREFERENCES = Object.freeze({
  // FALLBACK DEFAULT — used only when the wizard hasn't collected explicit
  // climate preferences yet (e.g. early testing, or a user who skips this
  // sub-step). This is NOT meant to represent "the average user" — it's a
  // neutral, low-opinion default chosen so the calculator degrades
  // gracefully rather than guessing. Every real result should be built
  // from an explicit answer to all four axes below.
  summerHeat: 'warm-fine',
  humidity: 'no-preference',
  winter: 'some-cold-fine',
  seasonalVariation: 'prefer-some-change',
});

const SUMMER_HEAT_PREF = {
  'prefer-hot': { ideal: 5, slope: 12 },
  'warm-fine': { ideal: 4, slope: 15 },
  'prefer-mild': { ideal: 2, slope: 18 },
  'avoid-extreme-heat': { ideal: 1, slope: 22 },
};

const HUMIDITY_PREF = {
  'no-preference': null, // scores 100 regardless of actual humidity
  'prefer-moderate': { ideal: 3, slope: 18 },
  'prefer-drier': { ideal: 1, slope: 22 },
};

const WINTER_PREF = {
  'prefer-mild': { ideal: 1, slope: 22 },
  'some-cold-fine': { ideal: 2.5, slope: 15 },
  'enjoy-real-winter': { ideal: 4, slope: 15 },
  'snow-cold-fine': { ideal: 5, slope: 10 },
};

const SEASON_PREF = {
  'dont-care': null, // scores 100 regardless of actual variation
  'prefer-some-change': { ideal: 3, slope: 15 },
  'four-distinct-seasons-important': { ideal: 5, slope: 18 },
};

function axisScore(prefMap, prefKey, actualValue, fallbackKey) {
  const entry = prefMap[prefKey] ?? prefMap[fallbackKey];
  if (entry === null || entry === undefined) return 100; // "no preference" / "don't care"
  return Math.round(Math.max(0, Math.min(100, 100 - entry.slope * Math.abs(actualValue - entry.ideal))));
}

/**
 * @param {Object} metro
 * @param {Object} [climatePreferences] - see DEFAULT_CLIMATE_PREFERENCES
 *   for shape; falls back to the neutral default per-axis if omitted.
 * @returns {{summerHeat:number, humidity:number, winter:number, seasonalVariation:number, composite:number}}
 */
export function climateFitScore(metro, climatePreferences) {
  const prefs = { ...DEFAULT_CLIMATE_PREFERENCES, ...(climatePreferences || {}) };

  const summerHeat = axisScore(SUMMER_HEAT_PREF, prefs.summerHeat, metro.climate.summerHeatIntensity, 'warm-fine');
  const humidity = axisScore(HUMIDITY_PREF, prefs.humidity, metro.climate.summerHumidityLevel, 'no-preference');
  const winter = axisScore(WINTER_PREF, prefs.winter, metro.climate.winterSeverityScore, 'some-cold-fine');
  const seasonalVariation = axisScore(SEASON_PREF, prefs.seasonalVariation, metro.climate.fourSeasonVariation, 'prefer-some-change');

  const composite = Math.round((summerHeat + humidity + winter + seasonalVariation) / 4);

  return { summerHeat, humidity, winter, seasonalVariation, composite };
}

/**
 * @param {Object} metro
 * @param {Object} [climatePreferences] - see climateFitScore()
 * @returns {{healthcare:number, climate:number, travel:number, amenities:number, risk:number}}
 */
export function lifestyleComponentScores(metro, climatePreferences, travelPreferences) {
  const healthcare = QUALITY_SCORE_MAP[metro.healthcare.medicareAdvantageMarketQuality] ?? 60;

  const climate = climateFitScore(metro, climatePreferences).composite;

  const { composite: travel, europeFit, southAmericaFit } = travelFitScore(metro, travelPreferences);

  const amenities = Math.round((metro.lifestyle.amenitiesScore + metro.lifestyle.walkabilityScore) / 2);

  const risk = metro.risk.resilienceScore;

  return {
    healthcare: Math.round(healthcare),
    climate,
    travel,
    europeFit,
    southAmericaFit,
    amenities,
    risk: Math.round(risk),
  };
}

/**
 * Derive Overall Fit weights from Step 5 priority answers. Each of the 6
 * top-level categories' weight is proportional to its importance rating —
 * this is what "adjust weights indirectly through preference questions"
 * has to mean mechanically, and it also resolves the spec's ambiguity
 * between the fixed 30% Financial Fit default and the "financial
 * affordability" importance question: the affordability rating simply IS
 * the input to the financial weight, not a second, competing number.
 *
 * @param {Object} priorities - keys are the 14 Step 5 factors, values are
 *   'not'|'somewhat'|'important'|'very'
 */
export function resolveWeights(priorities) {
  const val = (key) => IMPORTANCE_VALUES[priorities[key]] ?? IMPORTANCE_VALUES.somewhat;

  const raw = {
    financial: val('financialAffordability'),
    healthcare: val('healthcareAccess'),
    climate: (val('climate') + val('fourSeasonVariation') + val('summerHeatTolerance') + val('winterColdTolerance')) / 4,
    travel: (val('internationalAirportAccess') + val('travelToEurope') + val('travelToSouthAmerica')) / 3,
    amenities: (val('natureScenery') + val('walkability') + val('cityAmenities') + val('quietSmallTownFeel')) / 4,
    risk: val('disasterInsuranceRisk'),
  };

  const sum = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const weights = {};
  for (const key of Object.keys(raw)) weights[key] = raw[key] / sum;
  return weights;
}

/**
 * Lifestyle Fit — the 5 lifestyle categories only, financial excluded
 * entirely (not just zero-weighted: the remaining weights are renormalized
 * to sum to 1 among themselves). This is what "Best Lifestyle Fit" on the
 * results page ranks by, distinct from Overall Fit.
 */
export function lifestyleFitScore(lifestyleScores, weights) {
  const lifestyleWeightSum = weights.healthcare + weights.climate + weights.travel + weights.amenities + weights.risk;
  if (!lifestyleWeightSum) return Math.round((lifestyleScores.healthcare + lifestyleScores.climate + lifestyleScores.travel + lifestyleScores.amenities + lifestyleScores.risk) / 5);

  const score = (lifestyleScores.healthcare * weights.healthcare
    + lifestyleScores.climate * weights.climate
    + lifestyleScores.travel * weights.travel
    + lifestyleScores.amenities * weights.amenities
    + lifestyleScores.risk * weights.risk) / lifestyleWeightSum;
  return Math.round(score);
}

export function overallFitScore(financialScore, lifestyleScores, weights) {
  const score = financialScore * weights.financial
    + lifestyleScores.healthcare * weights.healthcare
    + lifestyleScores.climate * weights.climate
    + lifestyleScores.travel * weights.travel
    + lifestyleScores.amenities * weights.amenities
    + lifestyleScores.risk * weights.risk;
  return Math.round(score);
}

// ---------------------------------------------------------------------
// Tradeoff copy (deterministic, template-based — no LLM call)
// ---------------------------------------------------------------------

// Only these five roll up into the tradeoff-copy "best/worst component"
// language. lifestyleScores also carries europeFit/southAmericaFit
// (added for the Europe/South America sub-score architecture) which are
// sub-components OF travel, not sibling categories — including them here
// would let "europeFit" surface as a nonsensical "weakest area" with no
// entry in COMPONENT_LABELS.
const TRADEOFF_COMPONENT_KEYS = ['healthcare', 'climate', 'travel', 'amenities', 'risk'];

function topAndBottomComponent(scores) {
  const entries = TRADEOFF_COMPONENT_KEYS
    .filter((key) => key in scores)
    .map((key) => [key, scores[key]])
    .sort((a, b) => b[1] - a[1]);
  return { best: entries[0], worst: entries[entries.length - 1] };
}

const COMPONENT_LABELS = {
  healthcare: 'healthcare access',
  climate: 'climate fit',
  travel: 'international airport access',
  amenities: 'lifestyle and amenities',
  risk: 'disaster resilience',
};

/**
 * Overall-match language, tied to BOTH rank-within-set and absolute score,
 * using whichever is more conservative — this is what makes "solidly" for
 * a #7-of-7 result structurally impossible rather than just unlikely.
 * Rank alone would let a set of uniformly poor options call its "best"
 * one strong; score alone would let a last-place finish in a strong set
 * still sound good. Taking the minimum of the two tiers rules out both.
 */
function overallMatchTier(overallFit, rank, total) {
  const scoreTier = overallFit >= 75 ? 3 : overallFit >= 60 ? 2 : overallFit >= 45 ? 1 : 0;

  let rankTier;
  if (total > 1 && rank === total) rankTier = 0; // last place is always tier 0, regardless of score
  else if (rank === 1) rankTier = 3;
  else {
    const percentile = rank / total;
    rankTier = percentile <= 1 / 3 ? 3 : percentile <= 2 / 3 ? 2 : 1;
  }

  const tier = Math.min(scoreTier, rankTier);
  if (tier === 3) return rank === 1 ? 'strongest' : 'strong';
  if (tier === 2) return 'solid';
  if (tier === 1) return 'moderate';
  return 'weak';
}

const TIER_PHRASES = {
  strongest: 'the strongest overall match in this comparison',
  strong: 'a strong overall match',
  solid: 'a solid overall match',
  moderate: 'a moderate overall match for what you are looking for',
  weak: 'a weaker overall match for the preferences you entered',
};

/**
 * Compares Financial Fit against Lifestyle Fit to describe the actual
 * tradeoff being made, rather than restating either score — this is the
 * "leaves more room in your budget, but gives up points on X" /
 * "you'd spend more here, but it aligns with Y" framing.
 */
function budgetVsLifestyleClause(financialFit, lifestyleFit, lifestyleScores) {
  const { best, worst } = topAndBottomComponent(lifestyleScores);
  const gap = financialFit - lifestyleFit;

  if (gap >= 12) {
    return ` It leaves more room in your budget, but gives up points on ${COMPONENT_LABELS[worst[0]]}.`;
  }
  if (gap <= -12) {
    return ` You would likely spend more here, but it aligns more closely with your ${COMPONENT_LABELS[best[0]]} preferences.`;
  }
  return ` It balances budget room with ${COMPONENT_LABELS[best[0]]}, though ${COMPONENT_LABELS[worst[0]]} is its weaker spot.`;
}

function equityClause(homeEquity) {
  if (!homeEquity) return '';
  if (homeEquity.additionalCashNeeded > 0) {
    return ` Moving here would also require roughly $${homeEquity.additionalCashNeeded.toLocaleString()} in additional cash beyond your current equity.`;
  }
  if (homeEquity.equityReleased > 0) {
    return ` Selling and moving here would also release roughly $${homeEquity.equityReleased.toLocaleString()} in home equity.`;
  }
  return '';
}

export function buildTradeoffCopy(result, allResults, rankContext) {
  const total = allResults.length;
  const rank = [...allResults].sort((a, b) => b.overallFit - a.overallFit)
    .findIndex((r) => r.metroName === result.metroName) + 1;
  const tier = overallMatchTier(result.overallFit, rank, total);
  const { worst } = topAndBottomComponent(result.lifestyleScores);

  // rankContext lets the caller say whether `total` represents every
  // Explore-mode metro in the database or just the user's own hand-picked
  // Compare set — "#2 of 19" and "#2 of 4 places you selected" mean very
  // different things and must never be phrased identically.
  const rankLabel = rankContext?.mode === 'compare'
    ? `#${rank} of ${total} places you selected`
    : `#${rank} of ${total} Next Horizon locations`;

  const whyRankedHere = `${result.metroName} is ${TIER_PHRASES[tier]} (${rankLabel}, `
    + `Overall Fit ${result.overallFit}/100).`
    + budgetVsLifestyleClause(result.financialFit, result.lifestyleFit, result.lifestyleScores);

  const theTradeoff = `Its weakest area is ${COMPONENT_LABELS[worst[0]]} (${worst[1]}/100).`
    + equityClause(result.homeEquity);

  return { whyRankedHere, theTradeoff, rank, total, rankLabel };
}

// ---------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------

/**
 * Run the full calculation for one metro + one phase and return a single
 * flat result object, the shape ResultsView will consume.
 */
export function evaluateMetroForPhase(metroName, metro, people, homeInputs, priorities, phase, phaseLabel) {
  const income = calcIncome(people)[phase];
  const livingCosts = calcLivingCosts(metro, homeInputs, people.length);
  const healthcare = calcHealthcareCost(people, metro, phase, income);
  const stateTax = calcStateTax(people, phase, metro);
  const expensesTotal = livingCosts.totalMonthly + healthcare.totalMonthly + stateTax.monthlyTax;
  const surplus = calcSurplus(income, expensesTotal);
  const financialFit = financialFitScore(surplus.monthlySurplus, income.totalMonthly);
  const lifestyleScores = lifestyleComponentScores(metro, priorities.climatePreferences, priorities);
  const weights = resolveWeights(priorities);
  const lifestyleFit = lifestyleFitScore(lifestyleScores, weights);
  const overallFit = overallFitScore(financialFit, lifestyleScores, weights);
  const homeEquity = calcHomeEquity(homeInputs, metro);

  return {
    metroName,
    phase,
    phaseLabel,
    monthlyIncome: income.totalMonthly,
    monthlyExpenses: expensesTotal,
    monthlySurplus: surplus.monthlySurplus,
    surplusPercentage: surplus.surplusPercentage,
    requiredAdditionalWithdrawal: surplus.requiredAdditionalWithdrawal,
    potentialWithdrawalReduction: surplus.potentialWithdrawalReduction,
    magiComponents: surplus.magiComponents,
    housing: livingCosts.housing,
    living: livingCosts.living,
    healthcare,
    stateTax,
    homeEquity,
    financialFit,
    lifestyleScores,
    lifestyleFit,
    overallFit,
    weights,
  };
}

/**
 * Full multi-metro, multi-phase evaluation — the function ResultsView's
 * data-loading step calls directly.
 *
 * @param {Object} allMetros - METRO_DEFAULTS-shaped map
 * @param {string[]} metroNames - which metros to evaluate (excludes pending-data automatically)
 */
export function evaluateAllMetros(allMetros, metroNames, people, homeInputs, priorities) {
  const phases = buildHouseholdPhases(people);

  return metroNames
    .filter((name) => allMetros[name] && allMetros[name].status !== 'pending-data')
    .map((name) => {
      const metro = allMetros[name];
      const phase1 = evaluateMetroForPhase(name, metro, people, homeInputs, priorities, 'phase1', phases.phase1Label);
      const phase2 = phases.hasBridgePeriod
        ? evaluateMetroForPhase(name, metro, people, homeInputs, priorities, 'phase2', phases.phase2Label)
        : phase1;
      return { metroName: name, hasBridgePeriod: phases.hasBridgePeriod, bridgeYears: phases.bridgeYears, phase1, phase2 };
    });
}
