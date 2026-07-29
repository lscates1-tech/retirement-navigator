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
// - Figures below are current as of the 2026 tax year, sourced from the Tax Foundation,
//   IRS Rev. Proc. 2025-32, and Spanish tax-law summaries currently in force. Tax law
//   changes yearly -- these numbers need a periodic verification pass just like the
//   destination cost defaults do.
// - Spain: Catalonia (EUR 500,000 allowance) and Valencia (EUR 1,000,000 allowance,
//   raised in the 2026 update) are now modeled separately via `regionOverride` within
//   the High-Tax Zone. The marginal *scale* for both is still APPROXIMATED (each region
//   sets its own tariff, and Valencia currently reuses Catalonia's scale shape as a
//   placeholder). Treat High-Tax Zone regional tax as directionally correct, not exact.
//   The national ISGF math is more precisely sourced and should be trusted more than
//   the regional scale it's compared against.
// - Spain IRPF (income tax) is a simple national-average baseline (one combined
//   19-47% scale) and does NOT vary by region, even though real IRPF does -- Madrid is
//   meaningfully lower than Catalonia/Valencia in practice. This is intentionally a
//   rough estimate, not a per-region one.
// - US: the "Moderate Tax Zone" and "High Tax Zone" use one representative state's real
//   brackets as the default (Colorado flat rate; California's official 2026 brackets).
//   Pass `stateOverride` for higher precision on a specific state within a zone.
// - US federal tax and Spain IRPF are both now calculated internally (standard
//   deduction / personal minimum only, no credits or itemizing). Pass
//   `externalNationalIncomeTax` to override with a more precise figure if you have one.
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

// High-Tax Zone splits into two sub-regions with DIFFERENT allowances as of the
// 2026 update: Catalonia kept its EUR 500,000 allowance; Valencia raised its
// regional allowance to EUR 1,000,000. Both marginal scales below are
// APPROXIMATIONS of each region's own tariff -- see accuracy note at top of file.
const SPAIN_CATALONIA_ALLOWANCE = 500000;
const SPAIN_VALENCIA_ALLOWANCE = 1000000;

const SPAIN_CATALONIA_SCALE = [
  { upTo: 167129.45, rate: 0.0021 },
  { upTo: 334252.88, rate: 0.00315 },
  { upTo: 668499.75, rate: 0.00525 },
  { upTo: 1336999.51, rate: 0.00945 },
  { upTo: 2673999.01, rate: 0.01365 },
  { upTo: 5347998.03, rate: 0.01785 },
  { upTo: 10695996.06, rate: 0.02205 },
  { upTo: null, rate: 0.0275 },
];

// Valencia's much larger allowance means its scale only reaches wealthier estates.
// Approximated with the same shape as Catalonia's scale (see accuracy note above).
const SPAIN_VALENCIA_SCALE = SPAIN_CATALONIA_SCALE;

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
    description: 'Catalonia: EUR 500,000 allowance. Valencia: EUR 1,000,000 allowance (raised in the 2026 update). Both use a steeper progressive regional scale above their allowance.',
  },
};

// Spanish national personal income tax (IRPF). This is the COMBINED national-average
// scale (state scale + a typical regional supplement) commonly used for baseline
// estimates -- real IRPF splits into a state half and a region-specific half that
// varies by autonomous community (Madrid lowest, Catalonia/Valencia among the
// highest). This baseline does NOT vary by taxRegion; treat it as a simple estimate,
// not a region-accurate one -- see accuracy note at top of file.
const SPAIN_IRPF_SCALE = [
  { upTo: 12450, rate: 0.19 },
  { upTo: 20200, rate: 0.24 },
  { upTo: 35200, rate: 0.30 },
  { upTo: 60000, rate: 0.37 },
  { upTo: 300000, rate: 0.45 },
  { upTo: null, rate: 0.47 },
];
const SPAIN_IRPF_PERSONAL_MINIMUM = 5550; // per filer, 2026 (mínimo personal y familiar)

function calculateSpainIRPF(grossIncome, filers = 1) {
  const incomePerFiler = grossIncome / filers;
  const taxableBase = Math.max(0, incomePerFiler - SPAIN_IRPF_PERSONAL_MINIMUM);
  const taxPerFiler = applyBrackets(taxableBase, SPAIN_IRPF_SCALE);
  return round2(taxPerFiler * filers);
}

/**
 * Calculate Spain regional Wealth Tax + ISGF floor + a baseline IRPF income tax
 * estimate, for one tax year.
 *
 * @param {object} p
 * @param {'tax_friendly'|'standard'|'high_tax'} p.taxRegion
 * @param {number} p.netWealth - total worldwide net wealth for the household, EUR
 * @param {number} [p.primaryResidenceValue=0] - EUR value of primary home
 * @param {1|2} [p.filers=1] - 1 = single filer, 2 = couple (Spanish wealth tax is
 *   assessed per individual, not jointly -- this assumes assets split evenly between
 *   spouses, which is a simplification; real liability depends on actual ownership)
 * @param {'catalonia'|'valencia'} [p.regionOverride='catalonia'] - only used when
 *   taxRegion is 'high_tax', selects which sub-region's allowance/scale to apply
 * @param {number} [p.annualIncome=0] - gross annual household income, EUR, used for
 *   the baseline IRPF estimate below
 * @param {number} [p.externalNationalIncomeTax] - if provided, overrides the
 *   internally-computed IRPF estimate (e.g. with a more precise, region-specific figure)
 */
export function calculateSpainWealthTax({
  taxRegion,
  netWealth,
  primaryResidenceValue = 0,
  filers = 1,
  regionOverride = 'catalonia',
  annualIncome = 0,
  externalNationalIncomeTax,
}) {
  if (!SPAIN_TAX_REGIONS[taxRegion]) {
    throw new Error(`Unknown Spain taxRegion "${taxRegion}". Expected one of: ${Object.keys(SPAIN_TAX_REGIONS).join(', ')}`);
  }

  const wealthPerFiler = netWealth / filers;
  const residencePerFiler = Math.min(primaryResidenceValue, SPAIN_RESIDENCE_ALLOWANCE_CAP * filers) / filers;

  function highTaxAllowanceAndScale(region) {
    return region === 'valencia'
      ? { allowance: SPAIN_VALENCIA_ALLOWANCE, scale: SPAIN_VALENCIA_SCALE }
      : { allowance: SPAIN_CATALONIA_ALLOWANCE, scale: SPAIN_CATALONIA_SCALE };
  }

  function regionalTaxForZone(zone, perFilerWealth, region) {
    if (zone === 'tax_friendly') return 0;
    if (zone === 'high_tax') {
      const { allowance, scale } = highTaxAllowanceAndScale(region);
      const taxableBase = Math.max(0, perFilerWealth - allowance - residencePerFiler);
      return applyBrackets(taxableBase, scale);
    }
    const taxableBase = Math.max(0, perFilerWealth - SPAIN_GENERAL_ALLOWANCE - residencePerFiler);
    return applyBrackets(taxableBase, SPAIN_STATE_SCALE);
  }

  function isgfForFiler(perFilerWealth) {
    // ISGF always uses the general (unreduced) allowance, regardless of region.
    const adjusted = Math.max(0, perFilerWealth - SPAIN_GENERAL_ALLOWANCE - residencePerFiler);
    const aboveFloor = Math.max(0, adjusted - SPAIN_ISGF_FLOOR);
    return applyBrackets(aboveFloor, SPAIN_ISGF_SCALE);
  }

  const regionalPerFiler = regionalTaxForZone(taxRegion, wealthPerFiler, regionOverride);
  const isgfGrossPerFiler = isgfForFiler(wealthPerFiler);
  // Regional wealth tax already paid is fully creditable against ISGF -- the same
  // wealth is never taxed twice, only the difference (if any) is owed nationally.
  const isgfNetPerFiler = Math.max(0, isgfGrossPerFiler - regionalPerFiler);

  const regionalTax = round2(regionalPerFiler * filers);
  const isgf = round2(isgfNetPerFiler * filers);

  // Baseline national income tax (IRPF) -- computed internally by default so
  // totalTaxDrag reflects a complete picture without requiring an external figure.
  const irpf = externalNationalIncomeTax !== undefined
    ? round2(externalNationalIncomeTax)
    : calculateSpainIRPF(annualIncome, filers);

  const nationalTax = round2(isgf + irpf); // ISGF (wealth) + IRPF (income), combined national component

  // Compare against the same inputs run through the toughest High-Tax sub-region
  // (Catalonia's lower allowance) to show what's being saved.
  const highZoneRegional = regionalTaxForZone('high_tax', wealthPerFiler, 'catalonia');
  const highZoneIsgfGross = isgfForFiler(wealthPerFiler);
  const highZoneIsgfNet = Math.max(0, highZoneIsgfGross - highZoneRegional);
  const highZoneTotalPerFiler = highZoneRegional + highZoneIsgfNet;
  const thisZoneTotalPerFiler = regionalPerFiler + isgfNetPerFiler;
  const totalSavingsComparedToHighestZone = round2(
    (highZoneTotalPerFiler - thisZoneTotalPerFiler) * filers
  );

  const totalTaxDrag = round2(nationalTax + regionalTax);

  return {
    country: 'Spain',
    taxRegion,
    regionLabel: SPAIN_TAX_REGIONS[taxRegion].label,
    regionOverride: taxRegion === 'high_tax' ? regionOverride : null,
    currency: 'EUR',
    totalTaxDrag,
    breakdown: [nationalTax, regionalTax, totalSavingsComparedToHighestZone],
    breakdownDetail: {
      nationalTax, // ISGF (net of regional credit) + baseline IRPF estimate, combined
      regionalTax, // Regional Wealth Tax (Impuesto sobre el Patrimonio) only
      totalSavingsComparedToHighestZone,
      isgf,
      irpf,
    },
    notes: [
      'Regional Wealth Tax (IP) and the national Solidarity Tax on Large Fortunes (ISGF) are both modeled; the regional tax paid is credited against ISGF so the same wealth is not taxed twice.',
      taxRegion === 'tax_friendly' && netWealth / filers > SPAIN_GENERAL_ALLOWANCE + SPAIN_ISGF_FLOOR
        ? 'This wealth level exceeds the ISGF floor -- the 100% regional rebate does not eliminate wealth tax entirely at this net worth.'
        : null,
      'Catalonia/Valencia regional wealth-tax scale is an approximation (see code comments); the allowances (EUR 500k / EUR 1M) and the ISGF math are more precisely sourced.',
      'IRPF shown is a simple national-average estimate and does not reflect this specific region\'s actual combined rate -- real IRPF varies significantly by autonomous community.',
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

// US federal income tax -- 2026 brackets (IRS Rev. Proc. 2025-32) and standard
// deductions. Simple baseline: standard deduction only, no credits, no itemizing.
const FEDERAL_BRACKETS_SINGLE = [
  { upTo: 12400, rate: 0.10 },
  { upTo: 50400, rate: 0.12 },
  { upTo: 105700, rate: 0.22 },
  { upTo: 201775, rate: 0.24 },
  { upTo: 256225, rate: 0.32 },
  { upTo: 640600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];
const FEDERAL_BRACKETS_MFJ = [
  { upTo: 24800, rate: 0.10 },
  { upTo: 100800, rate: 0.12 },
  { upTo: 211400, rate: 0.22 },
  { upTo: 403550, rate: 0.24 },
  { upTo: 512450, rate: 0.32 },
  { upTo: 768700, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];
const FEDERAL_STANDARD_DEDUCTION = { single: 16100, mfj: 32200 };

function calculateFederalTax(grossIncome, filingStatus = 'single') {
  const deduction = FEDERAL_STANDARD_DEDUCTION[filingStatus] ?? FEDERAL_STANDARD_DEDUCTION.single;
  const brackets = filingStatus === 'mfj' ? FEDERAL_BRACKETS_MFJ : FEDERAL_BRACKETS_SINGLE;
  const taxableIncome = Math.max(0, grossIncome - deduction);
  return round2(applyBrackets(taxableIncome, brackets));
}

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
 * Calculate US state income tax + a baseline federal income tax estimate for one
 * tax year, grouped by zone.
 *
 * @param {object} p
 * @param {'no_state_tax'|'moderate_tax'|'high_tax'} p.taxRegion
 * @param {number} p.taxableIncome - gross annual household income, USD (federal
 *   standard deduction is applied internally; state tax is applied to this figure
 *   directly, as a simplification -- most states have their own deduction rules
 *   that aren't modeled here)
 * @param {string} [p.stateOverride] - specific state key (e.g. 'NC' vs 'CO') for
 *   higher precision than the zone default; must belong to the selected zone
 * @param {'single'|'mfj'} [p.filingStatus='single'] - used for the federal
 *   standard deduction and bracket table
 * @param {number} [p.externalNationalIncomeTax] - if provided, overrides the
 *   internally-computed federal estimate (e.g. with a more precise number)
 */
export function calculateUSStateTax({
  taxRegion,
  taxableIncome,
  stateOverride,
  filingStatus = 'single',
  externalNationalIncomeTax,
}) {
  const zone = US_TAX_REGIONS[taxRegion];
  if (!zone) {
    throw new Error(`Unknown US taxRegion "${taxRegion}". Expected one of: ${Object.keys(US_TAX_REGIONS).join(', ')}`);
  }

  const stateKey = stateOverride || zone.defaultState;

  const regionalTax = round2(stateIncomeTax(stateKey, taxableIncome));
  // Baseline federal tax -- computed internally by default (standard deduction only,
  // no credits/itemizing) so totalTaxDrag is complete without an external figure.
  const nationalTax = externalNationalIncomeTax !== undefined
    ? round2(externalNationalIncomeTax)
    : calculateFederalTax(taxableIncome, filingStatus);

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
      nationalTax, // federal income tax (standard deduction only, no credits)
      regionalTax, // state income tax
      totalSavingsComparedToHighestZone,
    },
    notes: [
      'Federal tax is a baseline estimate: standard deduction only, no credits or itemizing modeled.',
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
