// lib/regionalTaxCalculator.js
//
// Regional tax variation engine for Next Horizon's calculator.
//
// This is new logic -- the existing budget calculator (app/calculator/CalculatorClient.js)
// only compares cost-of-living, it has no tax math at all. This module is a standalone,
// framework-agnostic engine so it can be called from the budget calculator, the
// International Tax Strategies guide, or the future V2 AI decision engine without
// duplicating logic.
//
// Supported countries: Spain (regional Wealth Tax), United States (state income tax).
// Both use a `taxRegion` key that groups similar jurisdictions into one of three zones,
// per the site's "Tax-Friendly / Standard / High-Tax" and "No State Tax / Moderate /
// High Tax" framing used elsewhere on Next Horizon.
//
// IMPORTANT ACCURACY NOTES (read before extending):
// - Figures below are current as of the 2026 tax year, sourced from the Tax Foundation
//   and Spanish tax-law summaries currently in force. Tax law changes yearly -- these
//   numbers need a periodic verification pass just like the destination cost defaults do.
// - Spain: the Catalonia/Valencia regional wealth-tax *scale* (as opposed to the
//   allowance, which is confirmed at EUR 500,000) is APPROXIMATED. Catalonia and Valencia
//   each set their own tariff and don't share one, and this engine intentionally groups
//   them for simplicity per the site's three-zone model. Treat High-Tax Zone regional
//   tax as directionally correct, not exact. The national ISGF math is more precisely
//   sourced and should be trusted more than the regional scale it's compared against.
// - US: the "Moderate Tax Zone" and "High Tax Zone" use one representative state's real
//   brackets as the default (Colorado flat rate; California's official 2026 brackets).
//   Pass `stateOverride` for higher precision on a specific state within a zone.
// - Neither engine calculates federal (US) or national income tax (Spain IRPF). If you
//   have that figure from elsewhere, pass it in as `externalNationalIncomeTax` and it
//   will be layered into totalTaxDrag for display purposes -- it is NOT computed here.
// - This is a planning estimate, not tax advice. Every profile below should stay paired
//   with the site's existing "not tax or financial advice, verify with a professional"
//   disclaimer wherever it's surfaced in the UI.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Generic progressive-bracket calculator.
// brackets: array of { upTo, rate } ordered ascending, upTo = null means "and above".
// Returns tax owed on `base` (the amount already above any allowance/exemption).
function applyBrackets(base, brackets) {
  if (base <= 0) return 0;
  let tax = 0;
  let lastCap = 0;
  for (const { upTo, rate } of brackets) {
    const cap = upTo === null ? Infinity : upTo;
    if (base <= lastCap) break;
    const taxableInBand = Math.min(base, cap) - lastCap;
    if (taxableInBand > 0) tax += taxableInBand * rate;
    lastCap = cap;
    if (base <= cap) break;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// SPAIN -- Regional Wealth Tax (Impuesto sobre el Patrimonio) + national
// Solidarity Tax on Large Fortunes (ISGF) floor
// ---------------------------------------------------------------------------

const SPAIN_GENERAL_ALLOWANCE = 700000; // per individual, all regions & the ISGF alike
const SPAIN_RESIDENCE_ALLOWANCE_CAP = 300000; // primary residence, per individual

// Official state ("general regime") wealth tax scale -- applies in the Standard Zone
// (e.g. Balearic Islands, Asturias) where the region hasn't set its own tariff.
const SPAIN_STATE_SCALE = [
  { upTo: 167129.45, rate: 0.002 },
  { upTo: 334252.88, rate: 0.003 },
  { upTo: 668499.75, rate: 0.005 },
  { upTo: 1336999.51, rate: 0.009 },
  { upTo: 2673999.01, rate: 0.013 },
  { upTo: 5347998.03, rate: 0.017 },
  { upTo: 10695996.06, rate: 0.021 },
  { upTo: null, rate: 0.035 },
];

// High-Tax Zone (Catalonia / Valencia grouping). Reduced EUR 500,000 allowance is
// confirmed; the marginal scale below is an APPROXIMATION of Catalonia's own tariff
// (topping out around 2.75%) -- see accuracy note at top of file.
const SPAIN_HIGH_TAX_SCALE = [
  { upTo: 167129.45, rate: 0.0021 },
  { upTo: 334252.88, rate: 0.00315 },
  { upTo: 668499.75, rate: 0.00525 },
  { upTo: 1336999.51, rate: 0.00945 },
  { upTo: 2673999.01, rate: 0.01365 },
  { upTo: 5347998.03, rate: 0.01785 },
  { upTo: 10695996.06, rate: 0.02205 },
  { upTo: null, rate: 0.0275 },
];

// National Solidarity Tax on Large Fortunes (ISGF) -- the floor that prevents
// 100%-rebate regions (Madrid, Andalusia, Murcia, etc.) from eliminating wealth tax
// entirely for high-net-worth residents. Applies above EUR 3,000,000 of wealth
// remaining after the SAME general + residence allowances used above (not the
// region's reduced allowance, even in the High-Tax Zone).
const SPAIN_ISGF_SCALE = [
  { upTo: 2347998, rate: 0.017 }, // EUR 3,000,000 -- 5,347,998 band, width shown relative to the 3M floor
  { upTo: 7695996, rate: 0.021 }, // 5,347,998 -- 10,695,996 band
  { upTo: null, rate: 0.035 },    // above 10,695,996
];
const SPAIN_ISGF_FLOOR = 3000000;

export const SPAIN_TAX_REGIONS = {
  tax_friendly: {
    label: 'Tax-Friendly Zone',
    exampleRegions: ['Madrid', 'Andalusia (Costa del Sol)', 'Murcia'],
    description: '100% regional rebate on Wealth Tax. The national ISGF can still apply above EUR 3M net wealth.',
  },
  standard: {
    label: 'Standard Zone',
    exampleRegions: ['Balearic Islands', 'Asturias'],
    description: 'Baseline EUR 700,000 allowance (EUR 300,000 more for a primary residence), general state scale.',
  },
  high_tax: {
    label: 'High-Tax Zone',
    exampleRegions: ['Catalonia', 'Valencia'],
    description: 'Reduced EUR 500,000 allowance and a steeper progressive regional scale.',
  },
};

/**
 * Calculate Spain regional Wealth Tax + ISGF floor for one tax year.
 *
 * @param {object} p
 * @param {'tax_friendly'|'standard'|'high_tax'} p.taxRegion
 * @param {number} p.netWealth - total worldwide net wealth for the household, EUR
 * @param {number} [p.primaryResidenceValue=0] - EUR value of primary home
 * @param {1|2} [p.filers=1] - 1 = single filer, 2 = couple (Spanish wealth tax is
 *   assessed per individual, not jointly -- this assumes assets split evenly between
 *   spouses, which is a simplification; real liability depends on actual ownership)
 * @param {number} [p.externalNationalIncomeTax=0] - Spanish IRPF income tax, if known,
 *   layered into totalTaxDrag for display only -- not computed by this function
 */
export function calculateSpainWealthTax({
  taxRegion,
  netWealth,
  primaryResidenceValue = 0,
  filers = 1,
  externalNationalIncomeTax = 0,
}) {
  if (!SPAIN_TAX_REGIONS[taxRegion]) {
    throw new Error(`Unknown Spain taxRegion "${taxRegion}". Expected one of: ${Object.keys(SPAIN_TAX_REGIONS).join(', ')}`);
  }

  const wealthPerFiler = netWealth / filers;
  const residencePerFiler = Math.min(primaryResidenceValue, SPAIN_RESIDENCE_ALLOWANCE_CAP * filers) / filers;

  function regionalTaxForZone(zone, perFilerWealth) {
    if (zone === 'tax_friendly') return 0;
    const allowance = zone === 'high_tax' ? 500000 : SPAIN_GENERAL_ALLOWANCE;
    const taxableBase = Math.max(0, perFilerWealth - allowance - residencePerFiler);
    const scale = zone === 'high_tax' ? SPAIN_HIGH_TAX_SCALE : SPAIN_STATE_SCALE;
    return applyBrackets(taxableBase, scale);
  }

  function isgfForFiler(perFilerWealth) {
    // ISGF always uses the general (unreduced) allowance, regardless of region.
    const adjusted = Math.max(0, perFilerWealth - SPAIN_GENERAL_ALLOWANCE - residencePerFiler);
    const aboveFloor = Math.max(0, adjusted - SPAIN_ISGF_FLOOR);
    return applyBrackets(aboveFloor, SPAIN_ISGF_SCALE);
  }

  const regionalPerFiler = regionalTaxForZone(taxRegion, wealthPerFiler);
  const isgfGrossPerFiler = isgfForFiler(wealthPerFiler);
  // Regional wealth tax already paid is fully creditable against ISGF -- the same
  // wealth is never taxed twice, only the difference (if any) is owed nationally.
  const isgfNetPerFiler = Math.max(0, isgfGrossPerFiler - regionalPerFiler);

  const regionalTax = round2(regionalPerFiler * filers);
  const nationalTax = round2(isgfNetPerFiler * filers); // ISGF = the national component here

  // Compare against the same inputs run through the High-Tax Zone to show what's
  // being saved (or, if already in the High-Tax Zone, this will be 0).
  const highZoneRegional = regionalTaxForZone('high_tax', wealthPerFiler);
  const highZoneIsgfGross = isgfForFiler(wealthPerFiler);
  const highZoneIsgfNet = Math.max(0, highZoneIsgfGross - highZoneRegional);
  const highZoneTotalPerFiler = highZoneRegional + highZoneIsgfNet;
  const thisZoneTotalPerFiler = regionalPerFiler + isgfNetPerFiler;
  const totalSavingsComparedToHighestZone = round2(
    (highZoneTotalPerFiler - thisZoneTotalPerFiler) * filers
  );

  const totalTaxDrag = round2(nationalTax + regionalTax + externalNationalIncomeTax);

  return {
    country: 'Spain',
    taxRegion,
    regionLabel: SPAIN_TAX_REGIONS[taxRegion].label,
    currency: 'EUR',
    totalTaxDrag,
    breakdown: [nationalTax, regionalTax, totalSavingsComparedToHighestZone],
    breakdownDetail: {
      nationalTax, // ISGF (Solidarity Tax on Large Fortunes), net of regional credit
      regionalTax, // Regional Wealth Tax (Impuesto sobre el Patrimonio)
      totalSavingsComparedToHighestZone,
    },
    notes: [
      'Regional Wealth Tax (IP) and the national Solidarity Tax on Large Fortunes (ISGF) are both modeled; the regional tax paid is credited against ISGF so the same wealth is not taxed twice.',
      taxRegion === 'tax_friendly' && netWealth / filers > SPAIN_GENERAL_ALLOWANCE + SPAIN_ISGF_FLOOR
        ? 'This wealth level exceeds the ISGF floor -- the 100% regional rebate does not eliminate wealth tax entirely at this net worth.'
        : null,
      'Catalonia/Valencia regional scale is an approximation (see code comments); Madrid/Andalusia/Murcia rebate and the ISGF math are more precisely sourced.',
    ].filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// UNITED STATES -- State income tax by zone
// ---------------------------------------------------------------------------

// California official 2026 single-filer brackets (source: CA FTB via NerdWallet 2026 guide).
// Used as the default "worst case" representative for the High Tax Zone.
const CA_BRACKETS = [
  { upTo: 22158, rate: 0.01 },
  { upTo: 52528, rate: 0.02 },
  { upTo: 82904, rate: 0.04 },
  { upTo: 115084, rate: 0.06 },
  { upTo: 145448, rate: 0.08 },
  { upTo: 742958, rate: 0.093 },
  { upTo: 891542, rate: 0.103 },
  { upTo: 1485906, rate: 0.113 },
  { upTo: null, rate: 0.123 },
];
const CA_MENTAL_HEALTH_SURCHARGE_THRESHOLD = 1000000;
const CA_MENTAL_HEALTH_SURCHARGE_RATE = 0.01; // pushes the effective top rate to 13.3%

// New York -- simplified approximation, NOT the full official bracket table (NY has
// many more, narrower brackets). Good enough for directional "high tax" comparison;
// swap in the full NY DTF table before relying on this for a specific NY estimate.
const NY_BRACKETS_APPROX = [
  { upTo: 50000, rate: 0.045 },
  { upTo: 150000, rate: 0.06 },
  { upTo: 500000, rate: 0.0685 },
  { upTo: 1000000, rate: 0.0965 },
  { upTo: null, rate: 0.109 },
];

const US_STATE_PROFILES = {
  TX: { label: 'Texas', type: 'flat', rate: 0 },
  FL: { label: 'Florida', type: 'flat', rate: 0 },
  NC: { label: 'North Carolina', type: 'flat', rate: 0.0399 }, // 2026 flat rate, Tax Foundation
  CO: { label: 'Colorado', type: 'flat', rate: 0.044 }, // 2026 flat rate, Tax Foundation
  CA: { label: 'California', type: 'progressive', brackets: CA_BRACKETS },
  NY: { label: 'New York', type: 'progressive', brackets: NY_BRACKETS_APPROX },
};

export const US_TAX_REGIONS = {
  no_state_tax: {
    label: 'No State Tax Zone',
    exampleStates: ['Texas', 'Florida'],
    description: 'No state income tax.',
    defaultState: 'TX',
  },
  moderate_tax: {
    label: 'Moderate Tax Zone',
    exampleStates: ['North Carolina', 'Colorado'],
    description: 'Flat state income tax, roughly 4-4.5% (NC 3.99%, CO 4.40% as of 2026).',
    defaultState: 'CO',
  },
  high_tax: {
    label: 'High Tax Zone',
    exampleStates: ['California', 'New York'],
    description: 'Progressive state income tax, topping out above 10% (CA 13.3% incl. surcharge, NY 10.9%).',
    defaultState: 'CA',
  },
};

function stateIncomeTax(stateKey, taxableIncome) {
  const profile = US_STATE_PROFILES[stateKey];
  if (!profile) throw new Error(`Unknown US state key "${stateKey}"`);
  if (profile.type === 'flat') return taxableIncome * profile.rate;
  let tax = applyBrackets(taxableIncome, profile.brackets);
  if (stateKey === 'CA' && taxableIncome > CA_MENTAL_HEALTH_SURCHARGE_THRESHOLD) {
    tax += (taxableIncome - CA_MENTAL_HEALTH_SURCHARGE_THRESHOLD) * CA_MENTAL_HEALTH_SURCHARGE_RATE;
  }
  return tax;
}

/**
 * Calculate US state income tax for one tax year, grouped by zone.
 *
 * @param {object} p
 * @param {'no_state_tax'|'moderate_tax'|'high_tax'} p.taxRegion
 * @param {number} p.taxableIncome - annual taxable income, USD
 * @param {string} [p.stateOverride] - specific state key (e.g. 'NC' vs 'CO') for
 *   higher precision than the zone default; must belong to the selected zone
 * @param {number} [p.externalNationalIncomeTax=0] - federal income tax, if known,
 *   layered into totalTaxDrag for display only -- not computed by this function
 */
export function calculateUSStateTax({
  taxRegion,
  taxableIncome,
  stateOverride,
  externalNationalIncomeTax = 0,
}) {
  const zone = US_TAX_REGIONS[taxRegion];
  if (!zone) {
    throw new Error(`Unknown US taxRegion "${taxRegion}". Expected one of: ${Object.keys(US_TAX_REGIONS).join(', ')}`);
  }

  const stateKey = stateOverride || zone.defaultState;

  const regionalTax = round2(stateIncomeTax(stateKey, taxableIncome));
  const nationalTax = round2(externalNationalIncomeTax); // federal tax, if supplied by caller

  const highZoneState = US_TAX_REGIONS.high_tax.defaultState;
  const highZoneTax = stateIncomeTax(highZoneState, taxableIncome);
  const totalSavingsComparedToHighestZone = round2(highZoneTax - regionalTax);

  const totalTaxDrag = round2(nationalTax + regionalTax);

  return {
    country: 'United States',
    taxRegion,
    regionLabel: zone.label,
    stateUsed: US_STATE_PROFILES[stateKey].label,
    currency: 'USD',
    totalTaxDrag,
    breakdown: [nationalTax, regionalTax, totalSavingsComparedToHighestZone],
    breakdownDetail: {
      nationalTax, // federal tax, only populated if externalNationalIncomeTax was passed in
      regionalTax, // state income tax
      totalSavingsComparedToHighestZone,
    },
    notes: [
      nationalTax === 0
        ? 'Federal income tax is not calculated here -- pass externalNationalIncomeTax if you have it from elsewhere, otherwise nationalTax reflects state-only comparison.'
        : null,
      stateKey === 'NY'
        ? 'New York uses a simplified bracket approximation, not the full official table -- treat as directional.'
        : null,
    ].filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

/**
 * Single entry point for the calculator UI: routes to the right country engine
 * based on `country`, and returns a consistent shape either way.
 *
 * @param {object} params - see calculateSpainWealthTax / calculateUSStateTax for
 *   the country-specific fields. `country` and `taxRegion` are always required.
 */
export function calculateRegionalTax(params) {
  const { country } = params;
  if (country === 'Spain') return calculateSpainWealthTax(params);
  if (country === 'United States') return calculateUSStateTax(params);
  throw new Error(
    `calculateRegionalTax: unsupported country "${country}". Currently supported: "Spain", "United States". ` +
    `Add a new branch here (and a *_TAX_REGIONS export) to support another country.`
  );
}

export const TAX_REGIONS_BY_COUNTRY = {
  Spain: SPAIN_TAX_REGIONS,
  'United States': US_TAX_REGIONS,
};
