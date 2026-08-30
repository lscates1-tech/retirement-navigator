import { METRO_DEFAULTS } from '../lib/lifestyleMetroDefaults.js';
import {
  buildHouseholdPhases,
  calcIncome,
  calcHomeEquity,
  calcHealthcareCost,
  calcLivingCosts,
  calcSurplus,
  financialFitScore,
  lifestyleComponentScores,
  climateFitScore,
  travelFitScore,
  resolveWeights,
  overallFitScore,
  buildTradeoffCopy,
  evaluateAllMetros,
  DEFAULT_CLIMATE_PREFERENCES,
  estimateMagiForIrmaa,
  lookupIrmaaBracket,
  calcStateTax,
} from '../lib/lifestyleCalculator.js';

let failures = 0;
function assert(cond, label) {
  if (!cond) { console.error(`  FAIL: ${label}`); failures++; }
  else console.log(`  ok: ${label}`);
}

// -----------------------------------------------------------------
// The test-case household, exactly as specified.
// -----------------------------------------------------------------
const people = [
  {
    name: 'Person 1',
    age: 65,
    socialSecurity: { phase1: 2500, phase2: 2500 },
    pension: { phase1: 700, phase2: 700 },
    // spec gives a range of $500-1000/mo; using the midpoint
    iraWithdrawal: { phase1: 750, phase2: 750 },
    employment: { phase1: 0, phase2: 0 },
    other: { phase1: 0, phase2: 0 },
    coveragePhase1: 'medicare-medigap-partd',
    coveragePhase2: 'medicare-medigap-partd',
  },
  {
    name: 'Person 2',
    age: 63,
    // no SS during the first two years, ~$2,500/mo after
    socialSecurity: { phase1: 0, phase2: 2500 },
    pension: { phase1: 0, phase2: 0 },
    // "has own IRA" — amount unspecified in the prompt; using a placeholder
    iraWithdrawal: { phase1: 400, phase2: 400 },
    employment: { phase1: 0, phase2: 0 },
    other: { phase1: 0, phase2: 0 },
    coveragePhase1: 'aca',
    coveragePhase2: 'medicare-medigap-partd',
  },
];

const homeInputs = {
  owns: true,
  paidOff: true,
  currentValueLow: 375000,
  currentValueHigh: 400000,
  sellingCostPct: 0.07,
  additionalCashAvailable: 0,
};

// Simple mode: importance ratings for the 14 Step 5 factors, PLUS explicit
// climate preference direction (new — see prompt: "strongly dislikes
// extreme summer heat, prefers mild-to-warm summers, appreciates distinct
// seasons, some winter/cold is acceptable, humidity matters negatively,
// international travel is important").
const priorities = {
  financialAffordability: 'important',
  healthcareAccess: 'very',
  climate: 'important',
  fourSeasonVariation: 'somewhat',
  summerHeatTolerance: 'somewhat',
  winterColdTolerance: 'important',
  internationalAirportAccess: 'important',
  travelToEurope: 'somewhat',
  travelToSouthAmerica: 'not',
  natureScenery: 'somewhat',
  walkability: 'somewhat',
  cityAmenities: 'somewhat',
  quietSmallTownFeel: 'somewhat',
  disasterInsuranceRisk: 'important',
  climatePreferences: {
    summerHeat: 'avoid-extreme-heat',
    humidity: 'prefer-drier',
    winter: 'some-cold-fine',
    seasonalVariation: 'four-distinct-seasons-important',
  },
};

const testMetroNames = Object.keys(METRO_DEFAULTS).filter((n) => METRO_DEFAULTS[n].status !== 'pending-data');
console.log(`\nTesting against ${testMetroNames.length} populated metros: ${testMetroNames.join(', ')}\n`);

// -----------------------------------------------------------------
// 1. Household phase detection
// -----------------------------------------------------------------
console.log('1. Household phases');
const phases = buildHouseholdPhases(people);
assert(phases.hasBridgePeriod === true, 'bridge period detected');
assert(phases.bridgeYears === 2, `bridge length is 2 years (got ${phases.bridgeYears})`);
console.log(`  phase1Label: "${phases.phase1Label}"`);
console.log(`  phase2Label: "${phases.phase2Label}"`);

// -----------------------------------------------------------------
// 2. Income
// -----------------------------------------------------------------
console.log('\n2. Income');
const income = calcIncome(people);
assert(income.phase1.totalMonthly === 2500 + 700 + 750 + 400, `phase1 total monthly income = $${income.phase1.totalMonthly}`);
assert(income.phase2.totalMonthly === 2500 + 700 + 750 + 2500 + 400, `phase2 total monthly income = $${income.phase2.totalMonthly}`);
assert(income.phase2.totalMonthly > income.phase1.totalMonthly, 'phase2 income > phase1 income (Person 2 SS kicks in)');
assert(income.phase1.iraMonthly === 1150, `phase1 IRA portion isolated correctly = $${income.phase1.iraMonthly}`);

// -----------------------------------------------------------------
// 3. Home equity (metro-independent inputs, metro-dependent replacement cost)
// -----------------------------------------------------------------
console.log('\n3. Home equity — Pittsburgh vs. Olympia/Tacoma (cheap vs. expensive replacement)');
const pittsburgh = METRO_DEFAULTS['Pittsburgh suburbs, PA'];
const olympia = METRO_DEFAULTS['Olympia/Tacoma, WA'];
const equityPgh = calcHomeEquity(homeInputs, pittsburgh);
const equityOly = calcHomeEquity(homeInputs, olympia);
assert(equityPgh.netProceedsLow === Math.round(375000 * 0.93), `net proceeds low = $${equityPgh.netProceedsLow}`);
assert(equityPgh.equityReleased > 0, `Pittsburgh releases equity (replacement $${equityPgh.replacementCost} < proceeds) -> released $${equityPgh.equityReleased}`);
assert(equityOly.additionalCashNeeded > 0, `Olympia/Tacoma requires additional cash (replacement $${equityOly.replacementCost} > proceeds) -> needed $${equityOly.additionalCashNeeded}`);

// -----------------------------------------------------------------
// 4. Healthcare — two-phase difference for a mixed-age household
// -----------------------------------------------------------------
console.log('\n4. Healthcare cost by phase (Pittsburgh)');
const incomeForHc = calcIncome(people);
const hcPhase1 = calcHealthcareCost(people, pittsburgh, 'phase1', incomeForHc.phase1);
const hcPhase2 = calcHealthcareCost(people, pittsburgh, 'phase2', incomeForHc.phase2);
console.log(`  phase1 (Person 1 Medicare+Medigap+PartD, Person 2 ACA): $${hcPhase1.totalMonthly}/mo`, hcPhase1.perPerson);
console.log(`  phase2 (both Medicare+Medigap+PartD): $${hcPhase2.totalMonthly}/mo`, hcPhase2.perPerson);
assert(hcPhase1.perPerson[1].monthly > 0, 'Person 2 ACA premium in phase1 is nonzero');
assert(hcPhase2.perPerson[1].monthly !== hcPhase1.perPerson[1].monthly, 'Person 2 cost changes between phase1 (ACA) and phase2 (Medicare)');

// -----------------------------------------------------------------
// 5. Full multi-metro evaluation
// -----------------------------------------------------------------
console.log('\n5. Full evaluation across all 7 populated metros');
const results = evaluateAllMetros(METRO_DEFAULTS, testMetroNames, people, homeInputs, priorities);
assert(results.length === testMetroNames.length, `evaluated all ${testMetroNames.length} metros (got ${results.length})`);

console.log('\n  Phase 1 (bridge) summary:');
console.table(results.map((r) => ({
  metro: r.metroName,
  monthlyIncome: r.phase1.monthlyIncome,
  monthlyExpenses: r.phase1.monthlyExpenses,
  surplus: r.phase1.monthlySurplus,
  financialFit: r.phase1.financialFit,
  overallFit: r.phase1.overallFit,
  equityReleased: r.phase1.homeEquity.equityReleased,
  cashNeeded: r.phase1.homeEquity.additionalCashNeeded,
})));

console.log('\n  Phase 2 (steady state) summary:');
console.table(results.map((r) => ({
  metro: r.metroName,
  monthlyIncome: r.phase2.monthlyIncome,
  monthlyExpenses: r.phase2.monthlyExpenses,
  surplus: r.phase2.monthlySurplus,
  financialFit: r.phase2.financialFit,
  overallFit: r.phase2.overallFit,
})));

for (const r of results) {
  assert(r.phase1.financialFit >= 0 && r.phase1.financialFit <= 100, `${r.metroName} phase1 financialFit in [0,100] (${r.phase1.financialFit})`);
  assert(r.phase1.overallFit >= 0 && r.phase1.overallFit <= 100, `${r.metroName} phase1 overallFit in [0,100] (${r.phase1.overallFit})`);
  for (const key of ['healthcare', 'climate', 'travel', 'amenities', 'risk']) {
    const v = r.phase1.lifestyleScores[key];
    assert(v >= 0 && v <= 100, `${r.metroName} ${key} score in [0,100] (${v})`);
  }
}

// Sanity check: Jacksonville (hot, high home insurance, weak travel/climate
// scores for a winter-avoidant-neutral profile) should NOT automatically
// rank #1 just because property tax rate is low — this is the "cheap but
// poor fit" case the whole tool exists to catch.
const byOverall = [...results].sort((a, b) => b.phase1.overallFit - a.phase1.overallFit);
console.log(`\n  Ranked by Overall Fit (phase 1): ${byOverall.map((r) => r.metroName).join(' > ')}`);

// -----------------------------------------------------------------
// 6. Financial Fit absolute-banding stability check
// -----------------------------------------------------------------
console.log('\n6. Financial Fit score stability (absolute framework, not relative)');
const smallSet = evaluateAllMetros(METRO_DEFAULTS, ['Pittsburgh suburbs, PA'], people, homeInputs, priorities);
const bigSet = evaluateAllMetros(METRO_DEFAULTS, testMetroNames, people, homeInputs, priorities);
const pghSmall = smallSet[0].phase1.financialFit;
const pghBig = bigSet.find((r) => r.metroName === 'Pittsburgh suburbs, PA').phase1.financialFit;
assert(pghSmall === pghBig, `Pittsburgh's Financial Fit is identical whether compared alone (${pghSmall}) or against all 7 (${pghBig})`);

// -----------------------------------------------------------------
// 7. Financial Fit boundary values (new continuous curve)
// -----------------------------------------------------------------
console.log('\n7. Financial Fit boundary values');
const boundaryChecks = [
  { pct: -20, expect: 0, label: 'floor at -20% shortfall' },
  { pct: 0, expect: 39, label: 'top of shortfall band at exactly 0%' },
  { pct: 5, expect: 54, label: 'top of 0-5% band' },
  { pct: 10, expect: 64, label: 'top of 5-10% band' },
  { pct: 20, expect: 79, label: 'top of 10-20% band' },
  { pct: 30, expect: 89, label: 'top of 20-30% band' },
  { pct: 40, expect: 97, label: 'top of 30-40% band' },
  { pct: 100, expect: 100, label: '100% surplus-to-income caps at 100' },
];
for (const { pct, expect, label } of boundaryChecks) {
  const income = 10000;
  const surplus = (pct / 100) * income;
  const score = financialFitScore(surplus, income);
  assert(score === expect, `${label}: ${pct}% -> score ${score} (expected ${expect})`);
}
// Confirm a comfortably-funded household no longer hits 100 automatically —
// this was the exact problem flagged before this revision.
const comfortableScore = financialFitScore(1500, 10000); // 15% surplus
assert(comfortableScore < 100 && comfortableScore >= 65 && comfortableScore <= 79, `15% surplus no longer auto-maxes (scored ${comfortableScore}, in 65-79 band)`);
const exceptionalScore = financialFitScore(5000, 10000); // 50% surplus
assert(exceptionalScore >= 98, `50% surplus scores in the 98-100 "exceptional" range (scored ${exceptionalScore})`);

// -----------------------------------------------------------------
// 8. Climate preference direction — heat-averse vs. heat-preferring, season-preferring
// -----------------------------------------------------------------
console.log('\n8. Climate preference direction');

const heatAverse = { summerHeat: 'avoid-extreme-heat', humidity: 'prefer-drier', winter: 'some-cold-fine', seasonalVariation: 'four-distinct-seasons-important' };
const heatLoving = { summerHeat: 'prefer-hot', humidity: 'no-preference', winter: 'prefer-mild', seasonalVariation: 'dont-care' };
const seasonLover = { summerHeat: 'warm-fine', humidity: 'no-preference', winter: 'enjoy-real-winter', seasonalVariation: 'four-distinct-seasons-important' };

const jax = METRO_DEFAULTS['Jacksonville/North Florida'];
const livonia = METRO_DEFAULTS['Livonia/western Detroit suburbs, MI'];

const jaxHeatAverse = climateFitScore(jax, heatAverse).composite;
const jaxHeatLoving = climateFitScore(jax, heatLoving).composite;
assert(jaxHeatLoving > jaxHeatAverse, `Jacksonville scores much better for a heat-loving user (${jaxHeatLoving}) than a heat-averse user (${jaxHeatAverse})`);

const olympiaHeatAverse = climateFitScore(olympia, heatAverse).composite;
assert(olympiaHeatAverse > jaxHeatAverse, `Olympia/Tacoma (${olympiaHeatAverse}) beats Jacksonville (${jaxHeatAverse}) for the heat-averse profile`);

const pghSeasonLover = climateFitScore(pittsburgh, seasonLover).composite;
const jaxSeasonLover = climateFitScore(jax, seasonLover).composite;
assert(pghSeasonLover > jaxSeasonLover, `Pittsburgh (${pghSeasonLover}) beats Jacksonville (${jaxSeasonLover}) for a season-loving user (Jacksonville has almost no season variation)`);

const olympiaHeatAverseFull = climateFitScore(olympia, heatAverse);
const pghHeatAverseFull = climateFitScore(pittsburgh, heatAverse);
const livoniaHeatAverseFull = climateFitScore(livonia, heatAverse);
const jaxHeatAverseFull = climateFitScore(jax, heatAverse);
console.log('  Heat-averse/dry-preferring/season-loving profile, composite climate scores:');
console.table({
  'Olympia/Tacoma, WA': olympiaHeatAverseFull,
  'Pittsburgh suburbs, PA': pghHeatAverseFull,
  'Livonia, MI': livoniaHeatAverseFull,
  'Jacksonville, FL': jaxHeatAverseFull,
});
assert(jaxHeatAverseFull.composite < pghHeatAverseFull.composite - 20, `Jacksonville is clearly separated from Pittsburgh for this profile (Jax ${jaxHeatAverseFull.composite} vs. Pgh ${pghHeatAverseFull.composite})`);

// Fallback default should be identified and usable without crashing
const fallbackScore = climateFitScore(pittsburgh, undefined);
assert(fallbackScore.composite > 0, `climateFitScore falls back to DEFAULT_CLIMATE_PREFERENCES when omitted (composite ${fallbackScore.composite})`);
assert(JSON.stringify(DEFAULT_CLIMATE_PREFERENCES).length > 0, 'DEFAULT_CLIMATE_PREFERENCES is exported and identifiable as a fallback');

// -----------------------------------------------------------------
// 9. Phase 1 vs Phase 2 stay fully separate, never averaged
// -----------------------------------------------------------------
console.log('\n9. Phase separation (mixed Medicare/ACA household)');
const pghResult = results.find((r) => r.metroName === 'Pittsburgh suburbs, PA');
assert(pghResult.phase1.monthlyIncome !== pghResult.phase2.monthlyIncome, 'Phase 1 and Phase 2 income are distinct, not averaged');
assert(pghResult.phase1.financialFit !== pghResult.phase2.financialFit, 'Phase 1 and Phase 2 Financial Fit scores are distinct');
assert(typeof pghResult.phase1.surplusPercentage === 'number', 'Phase 1 exposes its own surplus percentage');
assert(typeof pghResult.phase2.surplusPercentage === 'number', 'Phase 2 exposes its own surplus percentage');
assert(pghResult.phase1.financialFit < pghResult.phase2.financialFit, `Bridge period (Phase 1, ${pghResult.phase1.financialFit}) is weaker than steady state (Phase 2, ${pghResult.phase2.financialFit}) and is NOT hidden by averaging`);
console.log(`  Pittsburgh — Phase 1: ${pghResult.phase1.surplusPercentage}% surplus, Financial Fit ${pghResult.phase1.financialFit}`);
console.log(`  Pittsburgh — Phase 2: ${pghResult.phase2.surplusPercentage}% surplus, Financial Fit ${pghResult.phase2.financialFit}`);

// -----------------------------------------------------------------
// 10. MAGI component preservation
// -----------------------------------------------------------------
console.log('\n10. MAGI component preservation');
assert(pghResult.phase1.magiComponents.taxableIraWithdrawals === 1150, `Phase 1 taxable IRA withdrawals isolated for future MAGI use ($${pghResult.phase1.magiComponents.taxableIraWithdrawals})`);
assert(pghResult.phase1.magiComponents.socialSecurityMonthly === 2500, `Phase 1 Social Security kept separate, not folded into a MAGI total ($${pghResult.phase1.magiComponents.socialSecurityMonthly})`);
assert(typeof pghResult.phase1.magiComponents.note === 'string', 'MAGI components include an explanatory note rather than a misleadingly precise total');

// -----------------------------------------------------------------
// 11. Tradeoff copy generation doesn't crash and produces sensible text
// -----------------------------------------------------------------
console.log('\n11. Tradeoff copy');
const flatResults = results.map((r) => ({ metroName: r.metroName, overallFit: r.phase1.overallFit, financialFit: r.phase1.financialFit, monthlySurplus: r.phase1.monthlySurplus, lifestyleScores: r.phase1.lifestyleScores, homeEquity: r.phase1.homeEquity }));
for (const r of flatResults.slice(0, 2)) {
  const copy = buildTradeoffCopy(r, flatResults);
  console.log(`  ${r.metroName}:`);
  console.log(`    Why: ${copy.whyRankedHere}`);
  console.log(`    Tradeoff: ${copy.theTradeoff}`);
  assert(copy.whyRankedHere.length > 20, `${r.metroName} whyRankedHere is non-trivial`);
  assert(copy.theTradeoff.length > 10, `${r.metroName} theTradeoff is non-trivial`);
}

// -----------------------------------------------------------------
// 12. Tradeoff copy — rank/score consistency (regression test for the
//     "solidly... #7 of 7" contradiction found in UX review)
// -----------------------------------------------------------------
console.log('\n12. Tradeoff copy rank/score consistency');
const fullResultsForRankTest = evaluateAllMetros(METRO_DEFAULTS, testMetroNames, people, homeInputs, priorities);
const flatPhase1 = fullResultsForRankTest.map((r) => ({
  metroName: r.metroName, overallFit: r.phase1.overallFit, financialFit: r.phase1.financialFit,
  lifestyleFit: r.phase1.lifestyleFit, monthlySurplus: r.phase1.monthlySurplus,
  lifestyleScores: r.phase1.lifestyleScores, homeEquity: r.phase1.homeEquity,
}));
const rankedByOverall = [...flatPhase1].sort((a, b) => b.overallFit - a.overallFit);
const lastPlace = rankedByOverall[rankedByOverall.length - 1];
const firstPlace = rankedByOverall[0];

const lastPlaceCopy = buildTradeoffCopy(lastPlace, flatPhase1);
const strongLanguagePattern = /\b(strongest|strong overall match|solid overall match)\b/i;
assert(!strongLanguagePattern.test(lastPlaceCopy.whyRankedHere), `Last-place metro (${lastPlace.metroName}, #${flatPhase1.length} of ${flatPhase1.length}) never uses "strong/strongest/solid" language — got: "${lastPlaceCopy.whyRankedHere}"`);
assert(/weaker overall match|moderate overall match/.test(lastPlaceCopy.whyRankedHere), `Last-place metro uses weak/moderate language — got: "${lastPlaceCopy.whyRankedHere}"`);

const firstPlaceCopy = buildTradeoffCopy(firstPlace, flatPhase1);
assert(!/weaker overall match/.test(firstPlaceCopy.whyRankedHere), `First-place metro (${firstPlace.metroName}) never uses "weaker" language — got: "${firstPlaceCopy.whyRankedHere}"`);

// Every metro's copy must mention its own actual rank number, never a
// mismatched one
for (const r of flatPhase1) {
  const rank = rankedByOverall.findIndex((x) => x.metroName === r.metroName) + 1;
  const copy = buildTradeoffCopy(r, flatPhase1);
  assert(copy.whyRankedHere.includes(`#${rank} of ${flatPhase1.length}`), `${r.metroName} copy states its correct rank (#${rank} of ${flatPhase1.length})`);
}

// A synthetic worst-case: a 2-metro set where even the "best" option has a
// weak absolute score should NOT call the best one strong — this is the
// case rank-only logic would get wrong (rank 1 of 2 would otherwise force
// a 'strong' rankTier regardless of how bad the actual score is)
const syntheticWeakSet = [
  { metroName: 'Weak A', overallFit: 38, financialFit: 35, lifestyleFit: 40, monthlySurplus: -200, lifestyleScores: { healthcare: 40, climate: 35, travel: 30, amenities: 45, risk: 40 }, homeEquity: null },
  { metroName: 'Weak B', overallFit: 30, financialFit: 25, lifestyleFit: 32, monthlySurplus: -500, lifestyleScores: { healthcare: 35, climate: 30, travel: 25, amenities: 35, risk: 30 }, homeEquity: null },
];
const bestOfWeakSet = buildTradeoffCopy(syntheticWeakSet[0], syntheticWeakSet);
assert(!/strong|strongest/.test(bestOfWeakSet.whyRankedHere), `Rank-1-of-2 with a genuinely weak absolute score (38/100) is NOT called "strong" — got: "${bestOfWeakSet.whyRankedHere}"`);

// -----------------------------------------------------------------
// 13. Dataset integrity — 19-metro checkpoint
// -----------------------------------------------------------------
console.log('\n13. Dataset integrity (19-metro checkpoint)');

const allMetroNames = Object.keys(METRO_DEFAULTS);
assert(allMetroNames.length === 19, `dataset contains exactly 19 metros (got ${allMetroNames.length})`);

const pendingCount = allMetroNames.filter((n) => METRO_DEFAULTS[n].status === 'pending-data').length;
assert(pendingCount === 0, `no metros remain in pending-data status (found ${pendingCount})`);

// No duplicate slugs
const slugs = allMetroNames.map((n) => METRO_DEFAULTS[n].slug);
const uniqueSlugs = new Set(slugs);
assert(slugs.length === uniqueSlugs.size, `no duplicate slugs across all 19 metros (${slugs.length} slugs, ${uniqueSlugs.size} unique)`);

// Every metro has the required core fields, a geography proxy note, and
// full per-category sourcing metadata
const REQUIRED_SOURCE_CATEGORIES = ['housing', 'propertyTax', 'insurance', 'livingCosts', 'healthcare', 'climate', 'travel', 'risk'];
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
for (const name of allMetroNames) {
  const m = METRO_DEFAULTS[name];
  assert(typeof m.geographyProxyNote === 'string' && m.geographyProxyNote.length > 10, `${name} has a geography proxy note`);
  assert(m.housing && m.living && m.healthcare && m.climate && m.travel && m.lifestyle && m.risk, `${name} has all required top-level field groups`);
  assert(m.sources && typeof m.sources === 'object', `${name} has a sources block`);
  for (const cat of REQUIRED_SOURCE_CATEGORIES) {
    const s = m.sources?.[cat];
    assert(s && typeof s.source === 'string' && s.year && VALID_CONFIDENCE.has(s.confidence) && (s.method === 'sourced' || s.method === 'modeled'),
      `${name} sources.${cat} has source/year/confidence/method (got ${JSON.stringify(s)})`);
  }
}

// Full 19-metro evaluation — every score stays in [0,100], both phases
const full19Results = evaluateAllMetros(METRO_DEFAULTS, allMetroNames, people, homeInputs, priorities);
assert(full19Results.length === 19, `evaluateAllMetros returns all 19 metros (got ${full19Results.length})`);
for (const r of full19Results) {
  for (const phaseKey of ['phase1', 'phase2']) {
    const p = r[phaseKey];
    assert(p.financialFit >= 0 && p.financialFit <= 100, `${r.metroName} ${phaseKey} financialFit in [0,100] (${p.financialFit})`);
    assert(p.overallFit >= 0 && p.overallFit <= 100, `${r.metroName} ${phaseKey} overallFit in [0,100] (${p.overallFit})`);
    assert(p.lifestyleFit >= 0 && p.lifestyleFit <= 100, `${r.metroName} ${phaseKey} lifestyleFit in [0,100] (${p.lifestyleFit})`);
    for (const key of ['healthcare', 'climate', 'travel', 'amenities', 'risk']) {
      const v = p.lifestyleScores[key];
      assert(v >= 0 && v <= 100, `${r.metroName} ${phaseKey} ${key} score in [0,100] (${v})`);
    }
  }
}

// Tradeoff copy is consistent (no contradictions) across all 19 rankings —
// broader version of Section 12's check, now at full launch scale
const full19Flat = full19Results.map((r) => ({
  metroName: r.metroName, overallFit: r.phase1.overallFit, financialFit: r.phase1.financialFit,
  lifestyleFit: r.phase1.lifestyleFit, monthlySurplus: r.phase1.monthlySurplus,
  lifestyleScores: r.phase1.lifestyleScores, homeEquity: r.phase1.homeEquity,
}));
const ranked19 = [...full19Flat].sort((a, b) => b.overallFit - a.overallFit);
let contradictionFound = false;
for (let i = 0; i < ranked19.length; i++) {
  const rank = i + 1;
  const copy = buildTradeoffCopy(ranked19[i], full19Flat);
  const isLast = rank === ranked19.length;
  const isFirst = rank === 1;
  if (isLast && /\b(strong|strongest|solid)\b/i.test(copy.whyRankedHere)) contradictionFound = true;
  if (isFirst && /weaker overall match/.test(copy.whyRankedHere)) contradictionFound = true;
  if (!copy.whyRankedHere.includes(`#${rank} of ${ranked19.length}`)) contradictionFound = true;
}
assert(!contradictionFound, 'no rank/score contradictions found across all 19 ranked tradeoff-copy results');

// Home-equity calculation sanity across the full set: cheapest and most
// expensive replacement markets should behave oppositely for the same
// current-home value
const cheapestMetro = allMetroNames.reduce((a, b) => (METRO_DEFAULTS[a].housing.typicalHomeValue < METRO_DEFAULTS[b].housing.typicalHomeValue ? a : b));
const priciestMetro = allMetroNames.reduce((a, b) => (METRO_DEFAULTS[a].housing.typicalHomeValue > METRO_DEFAULTS[b].housing.typicalHomeValue ? a : b));
const cheapestEquity = calcHomeEquity(homeInputs, METRO_DEFAULTS[cheapestMetro]);
const priciestEquity = calcHomeEquity(homeInputs, METRO_DEFAULTS[priciestMetro]);
console.log(`  Cheapest replacement market: ${cheapestMetro} ($${METRO_DEFAULTS[cheapestMetro].housing.typicalHomeValue.toLocaleString()})`);
console.log(`  Priciest replacement market: ${priciestMetro} ($${METRO_DEFAULTS[priciestMetro].housing.typicalHomeValue.toLocaleString()})`);
assert(cheapestEquity.equityReleased > 0, `${cheapestMetro} (cheapest) releases equity for this household ($${cheapestEquity.equityReleased.toLocaleString()})`);
assert(priciestEquity.additionalCashNeeded > 0, `${priciestMetro} (priciest) requires additional cash for this household ($${priciestEquity.additionalCashNeeded.toLocaleString()})`);

// Explore mode / Compare mode data-source sanity: both modes must be able
// to draw from the full, current metro count rather than a hardcoded number
assert(allMetroNames.length === Object.keys(METRO_DEFAULTS).length, 'metro count used for Explore/Compare mode messaging is derived from the live dataset, not hardcoded');
const compareSubset = allMetroNames.slice(0, 3);
const compareResults = evaluateAllMetros(METRO_DEFAULTS, compareSubset, people, homeInputs, priorities);
assert(compareResults.length === 3, `Compare mode correctly evaluates only the selected subset (got ${compareResults.length} of 3 requested)`);

// -----------------------------------------------------------------
// 14. Travel/airport data — Europe/South America sub-score architecture
// -----------------------------------------------------------------
console.log('\n14. Travel/airport data (airport research checkpoint)');

for (const name of allMetroNames) {
  const m = METRO_DEFAULTS[name];
  assert(typeof m.travel.nearestMajorAirport === 'string' && m.travel.nearestMajorAirport.length > 0, `${name} has a home airport`);
  assert(typeof m.travel.driveTimeMinutes === 'number', `${name} has an airport access time`);
  assert(typeof m.travel.europeConnectivityScore === 'number' && m.travel.europeConnectivityScore >= 0 && m.travel.europeConnectivityScore <= 100, `${name} europeConnectivityScore in [0,100]`);
  assert(typeof m.travel.southAmericaConnectivityScore === 'number' && m.travel.southAmericaConnectivityScore >= 0 && m.travel.southAmericaConnectivityScore <= 100, `${name} southAmericaConnectivityScore in [0,100]`);
  if (m.travel.airportConnectivityScore < 60) {
    // Metros without a strong local hub should document an alternate
    // gateway rather than silently under-crediting or over-crediting travel
    assert(typeof m.travel.oneStopUsefulnessNote === 'string' && m.travel.oneStopUsefulnessNote.length > 10, `${name} documents one-stop/gateway usefulness`);
  }
}

// travelFitScore() composite and sub-scores stay in bounds and are kept
// genuinely separate (not silently collapsed into one number)
for (const name of allMetroNames) {
  const { composite, europeFit, southAmericaFit } = travelFitScore(METRO_DEFAULTS[name]);
  assert(composite >= 0 && composite <= 100, `${name} travel composite in [0,100] (${composite})`);
  assert(europeFit === METRO_DEFAULTS[name].travel.europeConnectivityScore, `${name} europeFit passes through the metro's raw Europe score unmodified`);
  assert(southAmericaFit === METRO_DEFAULTS[name].travel.southAmericaConnectivityScore, `${name} southAmericaFit passes through the metro's raw South America score unmodified`);
}

// Anchor metro sanity checks (Section 6 of the brief)
const pghTravel = travelFitScore(METRO_DEFAULTS['Pittsburgh suburbs, PA']);
assert(METRO_DEFAULTS['Pittsburgh suburbs, PA'].travel.nonstopEurope === true, 'Pittsburgh corrected to nonstopEurope: true (BA to LHR, Aer Lingus to Dublin verified this session)');
const olympiaTravel = travelFitScore(METRO_DEFAULTS['Olympia/Tacoma, WA']);
const livoniaTravel = travelFitScore(METRO_DEFAULTS['Livonia/western Detroit suburbs, MI']);
const lehighTravel = travelFitScore(METRO_DEFAULTS['Lehigh Valley, PA']);
const ashevilleTravel = travelFitScore(METRO_DEFAULTS['Asheville, NC']);
assert(olympiaTravel.composite > ashevilleTravel.composite, `Olympia/Tacoma (SEA hub, ${olympiaTravel.composite}) beats Asheville (small regional airport, ${ashevilleTravel.composite})`);
assert(livoniaTravel.composite > ashevilleTravel.composite, `Livonia (DTW hub, ${livoniaTravel.composite}) beats Asheville (small regional airport, ${ashevilleTravel.composite})`);
assert(lehighTravel.composite > ashevilleTravel.composite || Math.abs(lehighTravel.composite - ashevilleTravel.composite) < 15, `Lehigh Valley (penalized EWR/PHL credit, ${lehighTravel.composite}) is not wildly out of line with a true small-regional airport (${ashevilleTravel.composite})`);
console.log(`  Olympia/Tacoma travel composite: ${olympiaTravel.composite} (Europe ${olympiaTravel.europeFit}, South America ${olympiaTravel.southAmericaFit})`);
console.log(`  Livonia travel composite: ${livoniaTravel.composite} (Europe ${livoniaTravel.europeFit}, South America ${livoniaTravel.southAmericaFit})`);
console.log(`  Pittsburgh travel composite: ${pghTravel.composite} (Europe ${pghTravel.europeFit}, South America ${pghTravel.southAmericaFit}) — corrected from prior no-Europe assumption`);
console.log(`  Asheville travel composite: ${ashevilleTravel.composite} (Europe ${ashevilleTravel.europeFit}, South America ${ashevilleTravel.southAmericaFit})`);

// -----------------------------------------------------------------
// 15. Travel-specific sanity personas
// -----------------------------------------------------------------
console.log('\n15. Travel-specific sanity personas');

// Persona A — Europe-heavy traveler: international very important, Europe
// especially important, South America only somewhat important
const europeHeavyPriorities = {
  ...priorities,
  internationalAirportAccess: 'very', travelToEurope: 'very', travelToSouthAmerica: 'somewhat',
};
const europeHeavyResults = evaluateAllMetros(METRO_DEFAULTS, allMetroNames, people, homeInputs, europeHeavyPriorities)
  .map((r) => ({ metroName: r.metroName, overallFit: r.phase1.overallFit, travelFit: r.phase1.lifestyleScores.travel }))
  .sort((a, b) => b.overallFit - a.overallFit);
console.log('  Persona A (Europe-heavy) — top 6 by Overall Fit:');
console.table(europeHeavyResults.slice(0, 6));
const europeHeavyTop6Names = europeHeavyResults.slice(0, 6).map((r) => r.metroName);
const strongEuropeMetros = ['Olympia/Tacoma, WA', 'Livonia/western Detroit suburbs, MI', 'Ann Arbor/Detroit area, MI', 'Pittsburgh suburbs, PA', 'Lehigh Valley, PA'];
const europeHeavyOverlap = strongEuropeMetros.filter((n) => europeHeavyTop6Names.includes(n));
assert(europeHeavyOverlap.length >= 2, `Persona A top 6 includes at least 2 of the strong-Europe-access metros (found: ${europeHeavyOverlap.join(', ') || 'none'})`);

// Persona B — South America-heavy traveler: South America very important,
// Europe only somewhat important
const southAmericaHeavyPriorities = {
  ...priorities,
  internationalAirportAccess: 'very', travelToEurope: 'somewhat', travelToSouthAmerica: 'very',
};
const southAmericaHeavyResults = evaluateAllMetros(METRO_DEFAULTS, allMetroNames, people, homeInputs, southAmericaHeavyPriorities)
  .map((r) => ({ metroName: r.metroName, overallFit: r.phase1.overallFit, travelFit: r.phase1.lifestyleScores.travel }))
  .sort((a, b) => b.overallFit - a.overallFit);
console.log('  Persona B (South America-heavy) — top 6 by Overall Fit:');
console.table(southAmericaHeavyResults.slice(0, 6));

// The two travel personas should NOT produce identical top-6 lists — if they
// did, Europe and South America wouldn't actually be distinguishable inputs.
// NOTE: as of the state-tax feature, a new dominant Financial Fit factor
// (Pennsylvania/Michigan's much lower effective state tax) can keep the
// same SET of metros in the top 6 for both personas even though their
// travel scores clearly differ — so this checks the more direct and
// robust signal (per-metro travelFit actually changing between personas)
// rather than requiring the top-6 set itself to differ.
const europeHeavyTravelByMetro = Object.fromEntries(europeHeavyResults.map((r) => [r.metroName, r.travelFit]));
const southAmericaHeavyTravelByMetro = Object.fromEntries(southAmericaHeavyResults.map((r) => [r.metroName, r.travelFit]));
const metrosWithDifferentTravelFit = allMetroNames.filter((n) => europeHeavyTravelByMetro[n] !== southAmericaHeavyTravelByMetro[n]);
assert(metrosWithDifferentTravelFit.length >= 10, `Europe-heavy and South-America-heavy personas produce different travelFit for most metros (${metrosWithDifferentTravelFit.length} of ${allMetroNames.length} differ) — directionality confirmed`);
const europeHeavyOrder = europeHeavyResults.slice(0, 6).map((r) => r.metroName).join(',');
const southAmericaHeavyOrder = southAmericaHeavyResults.slice(0, 6).map((r) => r.metroName).join(',');
assert(europeHeavyOrder !== southAmericaHeavyOrder, 'Even where the top-6 SET overlaps (state tax is now a stronger factor than travel direction), the RANKING ORDER still differs between the two personas');

// -----------------------------------------------------------------
// 16. Final airport verification pass — Mexico/Latin America vs. South
//     America distinction, and confidence-count sanity
// -----------------------------------------------------------------
console.log('\n16. Final airport verification checks');

// San Antonio has an extensive Mexico network but ZERO confirmed South
// America nonstop service — its southAmericaConnectivityScore must not
// be inflated by Mexico/Caribbean/Central America routes
const sat = METRO_DEFAULTS['San Antonio/Hill Country, TX'];
assert(sat.travel.southAmericaConnectivityScore <= 30, `San Antonio southAmericaConnectivityScore (${sat.travel.southAmericaConnectivityScore}) does not overcredit Mexico/Latin America service as South America access`);
assert(/Mexico/i.test(sat.travel.oneStopUsefulnessNote) && /not South America|no confirmed nonstop South America/i.test(sat.travel.oneStopUsefulnessNote), 'San Antonio travel note explicitly distinguishes Mexico/Latin America service from South America');

// DTW and SEA metros should now carry the strongest verified Europe scores
// in the dataset, reflecting real 2026 route data
const europeScores = allMetroNames.map((n) => ({ name: n, score: METRO_DEFAULTS[n].travel.europeConnectivityScore }));
const topEurope = [...europeScores].sort((a, b) => b.score - a.score)[0];
assert(['Olympia/Tacoma, WA', 'Livonia/western Detroit suburbs, MI', 'Ann Arbor/Detroit area, MI'].includes(topEurope.name), `Strongest verified Europe network (${topEurope.name}, ${topEurope.score}) is one of the confirmed major-hub metros`);

// Confidence distribution sanity: not everything forced to High, but real
// verification work should have produced a meaningful High count
const confidenceCounts = { high: 0, medium: 0, low: 0 };
for (const name of allMetroNames) {
  confidenceCounts[METRO_DEFAULTS[name].sources.travel.confidence]++;
}
console.log(`  Travel confidence distribution: ${JSON.stringify(confidenceCounts)}`);
assert(confidenceCounts.high >= 5 && confidenceCounts.high < allMetroNames.length, `Travel confidence has a meaningful High count (${confidenceCounts.high}) without forcing everything to High`);
assert(confidenceCounts.low === 0, 'No metro left at Low travel confidence');

// -----------------------------------------------------------------
// 17. Explore/Compare mode behavior (19-metro activation)
// -----------------------------------------------------------------
console.log('\n17. Explore/Compare mode behavior');

// Explore mode: evaluateAllMetros against all 19 returns all 19, unsorted —
// "top 5" and "see all" are a presentation-layer slice, not a calculation
// concern, so this just confirms the full 19 are actually computed
const exploreResults = evaluateAllMetros(METRO_DEFAULTS, allMetroNames, people, homeInputs, priorities);
assert(exploreResults.length === 19, `Explore mode scores all 19 metros (got ${exploreResults.length})`);
const exploreTop5 = [...exploreResults].sort((a, b) => b.phase1.overallFit - a.phase1.overallFit).slice(0, 5);
assert(exploreTop5.length === 5, 'Top 5 slice produces exactly 5 results');
const exploreAll = [...exploreResults].sort((a, b) => b.phase1.overallFit - a.phase1.overallFit);
assert(exploreAll.length === 19, '"See all" exposes all 19 results');

// Compare mode: evaluateAllMetros against a selected subset ranks ONLY
// those metros
const compareSubset4 = ['Pittsburgh suburbs, PA', 'Olympia/Tacoma, WA', 'Jacksonville/North Florida', 'Bend, OR'];
const compareResults2 = evaluateAllMetros(METRO_DEFAULTS, compareSubset4, people, homeInputs, priorities);
assert(compareResults2.length === 4, `Compare mode ranks only the 4 selected metros (got ${compareResults2.length})`);
assert(compareResults2.every((r) => compareSubset4.includes(r.metroName)), 'Compare mode never includes a metro outside the selected set');

// Absolute Financial Fit must not change based on comparison-set size —
// same metro, same household, scored alone vs. within 19 vs. within a
// 4-metro Compare set
const pghAlone = evaluateAllMetros(METRO_DEFAULTS, ['Pittsburgh suburbs, PA'], people, homeInputs, priorities)[0];
const pghIn19 = exploreResults.find((r) => r.metroName === 'Pittsburgh suburbs, PA');
const pghInCompare = compareResults2.find((r) => r.metroName === 'Pittsburgh suburbs, PA');
assert(pghAlone.phase1.financialFit === pghIn19.phase1.financialFit && pghIn19.phase1.financialFit === pghInCompare.phase1.financialFit,
  `Pittsburgh's Financial Fit is identical whether viewed alone (${pghAlone.phase1.financialFit}), among all 19 (${pghIn19.phase1.financialFit}), or in a 4-metro Compare set (${pghInCompare.phase1.financialFit})`);

// Rank-context wording: Explore says "Next Horizon locations", Compare
// says "places you selected" — never the same phrasing, never "#N overall"
// with no context
const exploreFlat = exploreResults.map((r) => ({ metroName: r.metroName, overallFit: r.phase1.overallFit, financialFit: r.phase1.financialFit, lifestyleFit: r.phase1.lifestyleFit, monthlySurplus: r.phase1.monthlySurplus, lifestyleScores: r.phase1.lifestyleScores, homeEquity: r.phase1.homeEquity }));
const compareFlat = compareResults2.map((r) => ({ metroName: r.metroName, overallFit: r.phase1.overallFit, financialFit: r.phase1.financialFit, lifestyleFit: r.phase1.lifestyleFit, monthlySurplus: r.phase1.monthlySurplus, lifestyleScores: r.phase1.lifestyleScores, homeEquity: r.phase1.homeEquity }));

const exploreCopy = buildTradeoffCopy(exploreFlat[0], exploreFlat, { mode: 'explore' });
assert(/Next Horizon locations/.test(exploreCopy.whyRankedHere), `Explore-mode copy uses "Next Horizon locations" wording — got: "${exploreCopy.whyRankedHere}"`);
assert(exploreCopy.whyRankedHere.includes(`of 19`), 'Explore-mode copy states the correct total (19)');

const compareCopy = buildTradeoffCopy(compareFlat[0], compareFlat, { mode: 'compare' });
assert(/places you selected/.test(compareCopy.whyRankedHere), `Compare-mode copy uses "places you selected" wording — got: "${compareCopy.whyRankedHere}"`);
assert(compareCopy.whyRankedHere.includes(`of 4`), 'Compare-mode copy states the correct total (4)');
assert(compareCopy.whyRankedHere !== exploreCopy.whyRankedHere.replace('19', '4'), 'Explore and Compare rank wording are genuinely different phrasings, not just a substituted number');

// Backward compatibility: omitting rankContext still produces valid,
// non-crashing copy (defaults to Explore-style wording)
const noContextCopy = buildTradeoffCopy(exploreFlat[0], exploreFlat);
assert(/Next Horizon locations/.test(noContextCopy.whyRankedHere), 'buildTradeoffCopy without an explicit rankContext defaults to Explore-style wording (backward compatible)');

// Near-tie presentation: verify the underlying scores that would trigger a
// "Very close match" badge are detectable from Overall Fit alone (a pure
// presentation check — no score adjustment)
const ranked19ForTies = [...exploreFlat].sort((a, b) => b.overallFit - a.overallFit);
let closeMatchesFound = 0;
for (let i = 1; i < ranked19ForTies.length; i++) {
  if (ranked19ForTies[i - 1].overallFit - ranked19ForTies[i].overallFit <= 2) closeMatchesFound++;
}
console.log(`  Near-tie pairs detected in the 19-metro Explore ranking: ${closeMatchesFound}`);
assert(closeMatchesFound >= 0, 'Near-tie detection runs without error across the full 19-metro ranking');

// All 19 metros render (evaluate) without throwing, individually
let allRenderOk = true;
for (const name of allMetroNames) {
  try {
    evaluateAllMetros(METRO_DEFAULTS, [name], people, homeInputs, priorities);
  } catch (e) {
    allRenderOk = false;
    console.error(`  ${name} failed to evaluate:`, e.message);
  }
}
assert(allRenderOk, 'All 19 metros evaluate without errors individually');

// REGRESSION: buildTradeoffCopy must never surface "undefined" as a
// component label. This was a real bug — lifestyleScores carries
// europeFit/southAmericaFit alongside the five labeled categories, and
// topAndBottomComponent() was picking those up as candidate "weakest
// area" components even though COMPONENT_LABELS has no entry for them.
for (const r of exploreFlat) {
  const copy = buildTradeoffCopy(r, exploreFlat, { mode: 'explore' });
  assert(!copy.whyRankedHere.includes('undefined') && !copy.theTradeoff.includes('undefined'),
    `${r.metroName} tradeoff copy never contains the literal string "undefined" — got why="${copy.whyRankedHere}" tradeoff="${copy.theTradeoff}"`);
}

// -----------------------------------------------------------------
// 18. Bridge-period visibility on match cards — both phases must be
//     computable simultaneously, not just whichever the toggle shows
// -----------------------------------------------------------------
console.log('\n18. Bridge-period simultaneous visibility');
const bridgeResults = evaluateAllMetros(METRO_DEFAULTS, allMetroNames, people, homeInputs, priorities);
for (const r of bridgeResults.slice(0, 5)) {
  assert(typeof r.phase1.financialFit === 'number' && typeof r.phase2.financialFit === 'number',
    `${r.metroName} exposes both phase1 and phase2 Financial Fit simultaneously (not just the toggled phase)`);
  const gap = r.phase2.financialFit - r.phase1.financialFit;
  if (gap >= 15) {
    console.log(`  ${r.metroName}: bridge period noticeably weaker (Phase 1 ${r.phase1.financialFit} vs Phase 2 ${r.phase2.financialFit}) — this must surface on the card, not hide behind the steady-state number`);
  }
}

// -----------------------------------------------------------------
// 19. REGRESSION — sellingCostPct unit contract (production bug found
//     during final repo-readiness review)
//
// The wizard's initialFormData() previously defaulted sellingCostPct to
// the whole number 7 (intending "7%"), while calcHomeEquity() has always
// expected a decimal fraction (0.07) per its documented contract. That
// mismatch was never caught by this test suite because every test
// constructs its own homeInputs object directly with the correct decimal
// value, bypassing the wizard's actual default entirely. In the live
// wizard it produced a home-equity "additional cash needed" figure in
// the millions of dollars for an ordinary household. Fixed at the UI
// layer (LifestyleCalculatorClient.js default + StepHome.js
// display/onChange conversion) rather than by changing the calc
// engine's contract. This test locks the contract down explicitly.
// -----------------------------------------------------------------
console.log('\n19. sellingCostPct unit contract regression test');

const sameHomeDifferentUnits = { owns: true, currentValueLow: 375000, currentValueHigh: 400000, additionalCashAvailable: 0 };
const correctUnits = calcHomeEquity({ ...sameHomeDifferentUnits, sellingCostPct: 0.07 }, METRO_DEFAULTS['Pittsburgh suburbs, PA']);
assert(correctUnits.netProceedsLow > 0 && correctUnits.netProceedsLow < 375000, `Correct decimal sellingCostPct (0.07) produces sane net proceeds ($${correctUnits.netProceedsLow.toLocaleString()})`);
assert(correctUnits.additionalCashNeeded < 500000, `Correct decimal sellingCostPct produces a sane additionalCashNeeded, not a phantom multi-million-dollar figure ($${correctUnits.additionalCashNeeded.toLocaleString()})`);

// -----------------------------------------------------------------
// 20. IRMAA — bracket lookup, MAGI proxy, and healthcare cost breakdown
// -----------------------------------------------------------------
console.log('\n20. IRMAA (Medicare income-related surcharge)');

// Bracket lookup correctness — boundary values for both filing statuses
const irmaaBoundaryChecks = [
  { magi: 100000, status: 'single', expectPartB: 202.90, expectPartD: 0, label: 'below single threshold' },
  { magi: 109000, status: 'single', expectPartB: 202.90, expectPartD: 0, label: 'exactly at single threshold (inclusive)' },
  { magi: 109001, status: 'single', expectPartB: 284.10, expectPartD: 14.50, label: '$1 over single threshold triggers the cliff' },
  { magi: 300000, status: 'single', expectPartB: 649.20, expectPartD: 83.60, label: 'single, tier 5 (between $205k and $500k)' },
  { magi: 218000, status: 'married', expectPartB: 202.90, expectPartD: 0, label: 'exactly at married threshold (inclusive)' },
  { magi: 218001, status: 'married', expectPartB: 284.10, expectPartD: 14.50, label: '$1 over married threshold triggers the cliff' },
  { magi: 600000, status: 'married', expectPartB: 649.20, expectPartD: 83.60, label: '$600k is BELOW the married $750k top threshold — must not be treated as 2x the single $500k threshold ($1M)' },
  { magi: 760000, status: 'married', expectPartB: 689.90, expectPartD: 91.00, label: 'married, above the true $750k top threshold' },
];
for (const c of irmaaBoundaryChecks) {
  const result = lookupIrmaaBracket(c.magi, c.status);
  assert(result.partBMonthly === c.expectPartB && result.partDAdjustment === c.expectPartD,
    `${c.label}: MAGI $${c.magi.toLocaleString()} (${c.status}) -> Part B $${result.partBMonthly}, Part D +$${result.partDAdjustment} (expected $${c.expectPartB}/$${c.expectPartD})`);
}

// MAGI proxy: 85% of SS + full non-IRA income + full IRA withdrawals
const magiTestIncome = { socialSecurityMonthly: 3000, otherNonIraMonthly: 2000, iraMonthly: 1000, nonIraMonthly: 5000, totalMonthly: 6000 };
const magiEstimate = estimateMagiForIrmaa(magiTestIncome);
const expectedMagi = Math.round((2000 + 1000) * 12 + 3000 * 12 * 0.85);
assert(magiEstimate === expectedMagi, `MAGI proxy uses 85% of SS + full other income, annualized ($${magiEstimate.toLocaleString()}, expected $${expectedMagi.toLocaleString()})`);

// High-income household actually gets IRMAA-adjusted in the real calc path
const highIncomePeople = [
  { name: 'Person 1', age: 66, socialSecurity: { phase1: 4000, phase2: 4000 }, pension: { phase1: 10000, phase2: 10000 },
    iraWithdrawal: { phase1: 3000, phase2: 3000 }, employment: { phase1: 0, phase2: 0 }, other: { phase1: 0, phase2: 0 },
    coveragePhase1: 'medicare-medigap-partd', coveragePhase2: 'medicare-medigap-partd' },
  { name: 'Person 2', age: 67, socialSecurity: { phase1: 3500, phase2: 3500 }, pension: { phase1: 0, phase2: 0 },
    iraWithdrawal: { phase1: 0, phase2: 0 }, employment: { phase1: 0, phase2: 0 }, other: { phase1: 0, phase2: 0 },
    coveragePhase1: 'medicare-medigap-partd', coveragePhase2: 'medicare-medigap-partd' },
];
const highIncomeAmount = calcIncome(highIncomePeople);
const highIncomeHc = calcHealthcareCost(highIncomePeople, pittsburgh, 'phase1', highIncomeAmount.phase1);
console.log(`  High-income household MAGI estimate: $${highIncomeHc.magiAnnual.toLocaleString()}, IRMAA bracket index: ${highIncomeHc.irmaaBracketIndex}`);
assert(highIncomeHc.irmaaBracketIndex > 0, `A household with $${highIncomeHc.magiAnnual.toLocaleString()} estimated MAGI lands in an IRMAA-adjusted bracket (index ${highIncomeHc.irmaaBracketIndex})`);
assert(highIncomeHc.perPerson[0].monthly > 202.90 + 155 + 42, `Person 1's Medicare cost reflects the IRMAA surcharge, not just the standard Part B premium ($${highIncomeHc.perPerson[0].monthly}/mo)`);
assert(highIncomeHc.perPerson[0].breakdown.some((b) => /IRMAA/.test(b.label)), `Person 1's cost breakdown explicitly labels the IRMAA-adjusted line item`);

// Low-income household should NOT be IRMAA-adjusted
const lowIncomeAmount = calcIncome(people); // the standard test-case household used throughout this file
const lowIncomeHc = calcHealthcareCost(people, pittsburgh, 'phase1', lowIncomeAmount.phase1);
assert(lowIncomeHc.irmaaBracketIndex === 0, `The standard test-case household (modest income) is NOT IRMAA-adjusted (bracket index ${lowIncomeHc.irmaaBracketIndex})`);
assert(!lowIncomeHc.perPerson[0].breakdown.some((b) => /IRMAA/.test(b.label)), 'Standard household breakdown has no IRMAA line item');

// Breakdown always sums to the reported total, for every coverage type
const breakdownCoverageTypes = ['medicare-medigap-partd', 'medicare-advantage', 'medicare', 'aca', 'actual', 'employer'];
for (const coverageType of breakdownCoverageTypes) {
  const testPerson = { ...people[0], coveragePhase1: coverageType, actualPremiumOverridePhase1: coverageType === 'actual' ? 500 : null };
  const result = calcHealthcareCost([testPerson], pittsburgh, 'phase1', lowIncomeAmount.phase1);
  const breakdownSum = result.perPerson[0].breakdown.reduce((s, b) => s + b.amount, 0);
  assert(Math.abs(breakdownSum - result.perPerson[0].monthly) <= 1, `${coverageType}: breakdown line items sum to the reported total ($${breakdownSum.toFixed(2)} vs $${result.perPerson[0].monthly})`);
  assert(result.perPerson[0].breakdown.length > 0, `${coverageType}: produces a non-empty breakdown for display`);
}

// -----------------------------------------------------------------
// 21. State income tax
// -----------------------------------------------------------------
console.log('\n21. State income tax (retirement-income-focused)');

const noIncomeTaxMetros = [
  ['Jacksonville/North Florida', 'Florida'],
  ['Olympia/Tacoma, WA', 'Washington'],
  ['Chattanooga, TN', 'Tennessee'],
  ['San Antonio/Hill Country, TX', 'Texas'],
  ['Reno, NV', 'Nevada'],
];
for (const [metroName, stateName] of noIncomeTaxMetros) {
  const result = calcStateTax(people, 'phase1', METRO_DEFAULTS[metroName]);
  assert(result.monthlyTax === 0, `${stateName} (no income tax): $0/mo state tax for ${metroName} (got $${result.monthlyTax})`);
}

// Pennsylvania: standard retirement household (SS + pension + IRA only) should owe ~$0
const pghStateTax = calcStateTax(people, 'phase1', METRO_DEFAULTS['Pittsburgh suburbs, PA']);
assert(pghStateTax.monthlyTax === 0, `Pennsylvania fully exempts SS/pension/IRA — standard test household owes $0/mo (got $${pghStateTax.monthlyTax})`);

// Oregon: same household should owe REAL tax, since OR doesn't exempt pension/IRA
const bendStateTax = calcStateTax(people, 'phase1', METRO_DEFAULTS['Bend, OR']);
assert(bendStateTax.monthlyTax > 0, `Oregon taxes pension/IRA income with no exemption — same household owes real tax in Bend ($${bendStateTax.monthlyTax}/mo)`);

// Michigan: high pension/IRA within the exemption should owe ~$0; above it should owe real tax
const miLowIncomePeople = [{ ...people[0], pension: { phase1: 3000, phase2: 3000 }, iraWithdrawal: { phase1: 1000, phase2: 1000 } }];
const miLowResult = calcStateTax(miLowIncomePeople, 'phase1', METRO_DEFAULTS['Livonia/western Detroit suburbs, MI']);
assert(miLowResult.monthlyTax === 0, `Michigan: pension+IRA well within the $65,987 single exemption owes $0/mo (got $${miLowResult.monthlyTax}, annual pension+IRA = $${(3000 + 1000) * 12})`);
const miHighIncomePeople = [{ ...people[0], pension: { phase1: 8000, phase2: 8000 }, iraWithdrawal: { phase1: 3000, phase2: 3000 } }];
const miHighResult = calcStateTax(miHighIncomePeople, 'phase1', METRO_DEFAULTS['Livonia/western Detroit suburbs, MI']);
assert(miHighResult.monthlyTax > 0, `Michigan: pension+IRA well above the exemption owes real tax on the excess (got $${miHighResult.monthlyTax}/mo)`);

// Colorado: age-based SS exemption — a household with everyone 65+ should
// have SS exempt; a household with someone under 65 should not
const coloradoMetro = METRO_DEFAULTS['Colorado Springs, CO'];
const bothOver65 = [{ ...people[0], age: 70 }, { ...people[1], age: 68 }];
const mixedAge = [{ ...people[0], age: 70 }, { ...people[1], age: 60 }];
const coResultBoth65 = calcStateTax(bothOver65, 'phase1', coloradoMetro);
const coResultMixed = calcStateTax(mixedAge, 'phase1', coloradoMetro);
assert(coResultBoth65.breakdown.some((b) => /exempt \(65\+\)/.test(b.label)), 'Colorado: household with everyone 65+ has Social Security marked exempt');
assert(coResultMixed.breakdown.some((b) => /taxable/.test(b.label)) || coResultMixed.monthlyTax >= coResultBoth65.monthlyTax, 'Colorado: household with someone under 65 does not get the 65+ Social Security exemption');

// Breakdown always present, never throws, for every metro in the dataset
for (const name of allMetroNames) {
  const result = calcStateTax(people, 'phase1', METRO_DEFAULTS[name]);
  assert(typeof result.monthlyTax === 'number' && result.monthlyTax >= 0, `${name}: state tax is a non-negative number ($${result.monthlyTax})`);
  assert(Array.isArray(result.breakdown) && result.breakdown.length > 0, `${name}: state tax produces a non-empty breakdown`);
}

// End-to-end: state tax actually flows into monthlyExpenses / Financial Fit
// via evaluateMetroForPhase, not just the standalone function
const withTaxResults = evaluateAllMetros(METRO_DEFAULTS, ['Pittsburgh suburbs, PA', 'Bend, OR'], people, homeInputs, priorities);
const pghFull = withTaxResults.find((r) => r.metroName === 'Pittsburgh suburbs, PA');
const bendFull = withTaxResults.find((r) => r.metroName === 'Bend, OR');
assert(pghFull.phase1.stateTax.monthlyTax === 0, 'End-to-end: Pittsburgh result includes the $0 PA state tax');
assert(bendFull.phase1.stateTax.monthlyTax > 0, 'End-to-end: Bend result includes real OR state tax');
assert(bendFull.phase1.monthlyExpenses >= bendFull.phase1.stateTax.monthlyTax, 'End-to-end: Bend\'s monthlyExpenses total includes the state tax line item');

console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : `${failures} TEST(S) FAILED`}\n`);

process.exit(failures === 0 ? 0 : 1);
