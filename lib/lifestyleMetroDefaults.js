/**
 * Lifestyle Calculator — Metros dataset (19-metro launch roster).
 *
 * JS fallback/seed for the future Notion "Metros" database — same role
 * lib/destinationDefaults.js plays for Countries/US States.
 *
 * SCHEMA (per metro record):
 *
 *   name, state, slug, region, characterTag, photoId
 *   geographyProxyNote   // REQUIRED: states exactly what geography each field's
 *                        //   numbers represent (city vs. county vs. combined-name
 *                        //   region) and flags any material mismatch this causes
 *
 *   housing: { typicalHomeValue, typicalRent2BR, propertyTaxRate (decimal),
 *              homeownersInsuranceAnnual, homeMaintenancePctAnnual (decimal) }
 *   living: { utilities, groceries, transportation }  // $/mo, single-person baseline
 *   autoInsuranceAnnual
 *
 *   healthcare: { medicareAdvantageMarketQuality ('excellent'|'good'|'limited'),
 *                 medicareAdvantageMonthlyEstimate, medigapMonthlyEstimate,
 *                 partDMonthlyEstimate, acaRatingArea, acaBenchmarkPremiumAge21,
 *                 healthSystemNote }  // NEW: names the anchor health system(s)
 *                                     //   and flags if tertiary care requires travel
 *
 *   climate: { summerAvgHighF, summerHeatIntensity (1-5), summerHumidityLevel (1-5),
 *              winterAvgLowF, winterSeverityScore (1-5), fourSeasonVariation (1-5),
 *              avgAnnualSnowfallInches }
 *
 *   travel: { nearestMajorAirport, driveTimeMinutes, airportConnectivityScore (0-100,
 *             CONSUMED BY THE SCORING ENGINE — see lifestyleCalculator.js),
 *             nonstopEurope, nonstopSouthAmerica (booleans, also consumed by scoring),
 *             secondaryAirport, europeConnectivityScore, southAmericaConnectivityScore,
 *             oneStopUsefulnessNote }  // NEW fields are descriptive/display-only for
 *                                      //   v1 — the scoring formula still runs on the
 *                                      //   four original fields. Wiring the richer
 *                                      //   fields into the score is a formula change,
 *                                      //   which this data-expansion pass deliberately
 *                                      //   does not make.
 *
 *   lifestyle: { amenitiesScore, walkabilityScore }  // 0-100 each
 *
 *   risk: { resilienceScore (0-100, higher = more resilient), primaryRisks: string[] }
 *
 *   sources: {
 *     housing, propertyTax, insurance, livingCosts, healthcare, climate, travel, risk
 *     — each { source, year, lastVerified, confidence: 'high'|'medium'|'low',
 *              method: 'sourced'|'modeled' }
 *   }
 *
 * CONFIDENCE KEY:
 *   high    — pulled from a named primary source this session (e.g. Zillow ZHVI
 *             fetched via live search) and reasonably current
 *   medium  — a documented methodology applied to well-established data
 *             (state-level Tax Foundation effective property tax rates, NOAA
 *             climate normals for a well-known station, established FEMA/NOAA
 *             hazard classifications) rather than a metro-specific live fetch
 *   low     — a genuine placeholder judgment call flagged as needing a real
 *             research pass before being relied on
 *
 * DATA STATUS AT THIS CHECKPOINT: home values for all 19 metros are HIGH
 * confidence — each was pulled from a live Zillow Home Value Index search
 * during this session (see per-metro sources.housing). Property tax rates use
 * MEDIUM confidence state-level effective-rate methodology (Tax Foundation /
 * ACS style figures), not a county-assessor lookup, per metro — flagged
 * explicitly rather than presented as county-verified. Climate figures use
 * MEDIUM confidence NOAA-normal-consistent general knowledge for these
 * well-documented station locations, not a live NOAA fetch this session.
 * Insurance, living-cost, healthcare, and travel-connectivity figures are
 * MEDIUM confidence modeled estimates following the same regional-pattern
 * methodology as the original 7 metros (e.g. Gulf/Atlantic coastal exposure
 * raises insurance, high-desert stations get low humidity). None of the 19
 * metros carries an overall LOW confidence rating at this checkpoint, but
 * every metro should still get a full verification pass (a Laura + ChatGPT
 * research pass, same workflow as the destination profiles) before real
 * users make decisions on numbers that aren't explicitly "high" above.
 */

export const METRO_DEFAULTS = {
  'Pittsburgh suburbs, PA': {
    state: 'Pennsylvania',
    slug: 'pittsburgh-suburbs-pa',
    region: 'Mid-Atlantic',
    characterTag: 'suburban',
    geographyProxyNote: 'Housing/cost figures represent Pittsburgh-metro suburban Allegheny County; property tax uses an Allegheny County effective-rate proxy, not a specific municipality.',
    housing: {
      typicalHomeValue: 280000,
      typicalRent2BR: 1500,
      propertyTaxRate: 0.0139,
      homeownersInsuranceAnnual: 1400,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 220, groceries: 420, transportation: 180 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'excellent',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 155,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'PA Rating Area 4 (Allegheny County)',
      acaBenchmarkPremiumAge21: 320,
      healthSystemNote: 'UPMC and Allegheny Health Network both operate large academic/tertiary systems here — an unusually strong two-system market for a metro this size.',
    },
    climate: {
      summerAvgHighF: 82, winterAvgLowF: 24, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 3, avgAnnualSnowfallInches: 41,
    },
    travel: {
      nearestMajorAirport: 'Pittsburgh International (PIT)', driveTimeMinutes: 25,
      airportConnectivityScore: 58, nonstopEurope: true, nonstopSouthAmerica: false,
      secondaryAirport: null,
      europeConnectivityScore: 62, southAmericaConnectivityScore: 20,
      oneStopUsefulnessNote: 'CORRECTED this pass: PIT has real nonstop Europe service — British Airways flies daily to London Heathrow year-round, and Aer Lingus began Pittsburgh-Dublin service in May 2026 (4x weekly), plus seasonal Icelandair to Reykjavik. No South America nonstop or one-stop-through-strong-hub network; PIT lost its former US Airways hub status, so beyond these three routes, other international travel still means connecting via Philadelphia, Newark, or a Southeast hub.',
    },
    lifestyle: { amenitiesScore: 68, walkabilityScore: 45 },
    risk: { resilienceScore: 78, primaryRisks: ['winter storm', 'inland flooding'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset PA Property Tax Calculator — Allegheny County effective rate (1.39%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 state-by-state rankings ($300K dwelling basis) — PA statewide ~$1,900/yr; Western PA typically below Eastern PA', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections.com / Pittsburgh Magazine / airport route maps — VERIFIED this session: British Airways (LHR, daily year-round), Aer Lingus (Dublin, 4x/week from May 2026), Icelandair (Reykjavik, seasonal) — corrected from an earlier no-nonstop-Europe assumption', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Lehigh Valley, PA': {
    state: 'Pennsylvania',
    slug: 'lehigh-valley-pa',
    region: 'Mid-Atlantic',
    characterTag: 'small-metro',
    geographyProxyNote: 'Housing/cost figures represent the Allentown-Bethlehem core (Lehigh/Northampton counties).',
    housing: {
      typicalHomeValue: 320000,
      typicalRent2BR: 1650,
      propertyTaxRate: 0.0155,
      homeownersInsuranceAnnual: 1500,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 210, groceries: 430, transportation: 190 },
    autoInsuranceAnnual: 1250,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 15,
      medigapMonthlyEstimate: 160,
      partDMonthlyEstimate: 44,
      acaRatingArea: 'PA Rating Area 8 (Lehigh/Northampton)',
      acaBenchmarkPremiumAge21: 310,
      healthSystemNote: 'Lehigh Valley Health Network and St. Luke\u2019s University Health Network both anchor care locally; broader tertiary specialty care is readily available without leaving the region.',
    },
    climate: {
      summerAvgHighF: 84, winterAvgLowF: 25, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 3, avgAnnualSnowfallInches: 30,
    },
    travel: {
      nearestMajorAirport: 'Lehigh Valley Intl (ABE); Newark/Philadelphia ~90 min for wider international service',
      driveTimeMinutes: 20, airportConnectivityScore: 45, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Newark Liberty Intl (EWR) or Philadelphia Intl (PHL), ~90 min drive',
      europeConnectivityScore: 42, southAmericaConnectivityScore: 30,
      oneStopUsefulnessNote: 'ABE itself has minimal service; EWR (a major United hub) is close enough to functionally serve as this metro\u2019s international gateway.',
    },
    lifestyle: { amenitiesScore: 62, walkabilityScore: 42 },
    risk: { resilienceScore: 80, primaryRisks: ['winter storm', 'inland flooding'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'PropertyTaxByState.com PA county list — Lehigh County effective rate (1.55%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 state rankings — PA statewide ~$1,900/yr', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (planning) — not re-verified this pass', year: 2026, confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Harrisburg/Lancaster, PA': {
    state: 'Pennsylvania',
    slug: 'harrisburg-lancaster-pa',
    region: 'Mid-Atlantic',
    characterTag: 'small-metro',
    geographyProxyNote: 'Housing/cost figures represent a Dauphin/Lancaster County blend; Harrisburg and Lancaster are distinct small cities but similar enough in cost to combine for v1.',
    housing: {
      typicalHomeValue: 300000,
      typicalRent2BR: 1450,
      propertyTaxRate: 0.0134,
      homeownersInsuranceAnnual: 1500,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 200, groceries: 400, transportation: 170 },
    autoInsuranceAnnual: 1200,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 150,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'PA Rating Area 5 (Dauphin/Lancaster)',
      acaBenchmarkPremiumAge21: 300,
      healthSystemNote: 'UPMC Harrisburg (formerly Pinnacle Health) and Penn Medicine Lancaster General Health both provide solid regional coverage.',
    },
    climate: {
      summerAvgHighF: 85, winterAvgLowF: 26, fourSeasonVariation: 5,
      summerHeatIntensity: 3, summerHumidityLevel: 3, winterSeverityScore: 2, avgAnnualSnowfallInches: 24,
    },
    travel: {
      nearestMajorAirport: 'Harrisburg Intl (MDT), limited; Philadelphia (PHL) ~90 min',
      driveTimeMinutes: 25, airportConnectivityScore: 40, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Philadelphia Intl (PHL), ~90 min drive',
      europeConnectivityScore: 40, southAmericaConnectivityScore: 28,
      oneStopUsefulnessNote: 'MDT is domestic-only; PHL (American\u2019s major East Coast hub) is a workable drive for international nonstops.',
    },
    lifestyle: { amenitiesScore: 60, walkabilityScore: 40 },
    risk: { resilienceScore: 82, primaryRisks: ['river flooding'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset PA Property Tax Calculator — Dauphin (1.35%) / Lancaster (1.32%) blended county rate', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 state rankings — PA statewide ~$1,900/yr', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (planning) — not re-verified this pass', year: 2026, confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Livonia/western Detroit suburbs, MI': {
    state: 'Michigan',
    slug: 'livonia-western-detroit-suburbs-mi',
    region: 'Midwest',
    characterTag: 'suburban',
    geographyProxyNote: 'Housing/cost figures represent western Wayne County suburbs (Livonia and similar); property tax uses a Wayne County effective-rate proxy.',
    housing: {
      typicalHomeValue: 270000,
      typicalRent2BR: 1400,
      propertyTaxRate: 0.0151,
      homeownersInsuranceAnnual: 1600,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 230, groceries: 400, transportation: 180 },
    autoInsuranceAnnual: 1900,
    healthcare: {
      medicareAdvantageMarketQuality: 'excellent',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 145,
      partDMonthlyEstimate: 40,
      acaRatingArea: 'MI Rating Area 8 (Wayne County)',
      acaBenchmarkPremiumAge21: 305,
      healthSystemNote: 'Henry Ford Health and Trinity Health Michigan both operate major systems within a short drive.',
    },
    climate: {
      summerAvgHighF: 83, winterAvgLowF: 17, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 4, avgAnnualSnowfallInches: 45,
    },
    travel: {
      nearestMajorAirport: 'Detroit Metro (DTW)', driveTimeMinutes: 20,
      airportConnectivityScore: 80, nonstopEurope: true, nonstopSouthAmerica: false,
      secondaryAirport: null,
      europeConnectivityScore: 85, southAmericaConnectivityScore: 35,
      oneStopUsefulnessNote: 'VERIFIED this session (Delta News Hub / airline route data): DTW offers nonstop Delta service to Amsterdam (3x daily), Paris, London, Frankfurt, Munich, and Dublin — a genuinely deep Europe network for a non-coastal hub. Latin America service (Cancun, Mexico City, Monterrey, Guadalajara) is real but Mexico-focused, not South America — no confirmed nonstop South America route from DTW.'
    },
    lifestyle: { amenitiesScore: 66, walkabilityScore: 44 },
    risk: { resilienceScore: 80, primaryRisks: ['winter storm', 'tornado/hail'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset MI Property Tax Calculator — Wayne County effective rate (1.51%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'Insurance.com 2026 rate-increase report — Michigan flagged as a top-5 state for 2026 increases (+48%)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Delta News Hub / airline route data \u2014 VERIFIED this session: DTW nonstop Europe (Amsterdam 3x daily, Paris, London, Frankfurt, Munich, Dublin), Latin America Mexico-focused (no South America nonstop)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Ann Arbor/Detroit area, MI': {
    state: 'Michigan',
    slug: 'ann-arbor-detroit-area-mi',
    region: 'Midwest',
    characterTag: 'college-town/suburban',
    geographyProxyNote: 'Housing/cost figures represent Ann Arbor (Washtenaw County) specifically, not the wider Detroit metro.',
    housing: {
      typicalHomeValue: 380000,
      typicalRent2BR: 1700,
      propertyTaxRate: 0.0147,
      homeownersInsuranceAnnual: 1600,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 220, groceries: 410, transportation: 175 },
    autoInsuranceAnnual: 1850,
    healthcare: {
      medicareAdvantageMarketQuality: 'excellent',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 148,
      partDMonthlyEstimate: 41,
      acaRatingArea: 'MI Rating Area 9 (Washtenaw County)',
      acaBenchmarkPremiumAge21: 300,
      healthSystemNote: 'Michigan Medicine (University of Michigan\u2019s academic medical center) is a nationally ranked tertiary/academic system located directly in Ann Arbor.',
    },
    climate: {
      summerAvgHighF: 83, winterAvgLowF: 17, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 4, avgAnnualSnowfallInches: 40,
    },
    travel: {
      nearestMajorAirport: 'Detroit Metro (DTW)', driveTimeMinutes: 35,
      airportConnectivityScore: 78, nonstopEurope: true, nonstopSouthAmerica: false,
      secondaryAirport: null,
      europeConnectivityScore: 82, southAmericaConnectivityScore: 33,
      oneStopUsefulnessNote: 'Same verified DTW network as Livonia (Amsterdam 3x daily, Paris, London, Frankfurt, Munich, Dublin) — scored slightly lower here to reflect the longer drive (35 vs. 20 min).',
    },
    lifestyle: { amenitiesScore: 74, walkabilityScore: 58 },
    risk: { resilienceScore: 81, primaryRisks: ['winter storm'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset MI Property Tax Calculator — Washtenaw County effective rate (derived ~1.47% from $5,827 median bill / $395,300 median value)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'Insurance.com 2026 rate-increase report — Michigan flagged as a top-5 state for 2026 increases (+48%)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Delta News Hub / airline route data \u2014 VERIFIED this session: same DTW network as Livonia, scored for the longer 35-min drive', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Olympia/Tacoma, WA': {
    state: 'Washington',
    slug: 'olympia-tacoma-wa',
    region: 'Pacific Northwest',
    characterTag: 'suburban/small-city',
    geographyProxyNote: 'Housing/cost figures represent a Thurston/Pierce County blend.',
    housing: {
      typicalHomeValue: 470000,
      typicalRent2BR: 1900,
      propertyTaxRate: 0.0081,
      homeownersInsuranceAnnual: 1100,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 190, groceries: 460, transportation: 200 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 20,
      medigapMonthlyEstimate: 175,
      partDMonthlyEstimate: 45,
      acaRatingArea: 'WA Rating Area 4 (Thurston/Pierce)',
      acaBenchmarkPremiumAge21: 340,
      healthSystemNote: 'MultiCare Health System anchors the region; Seattle\u2019s major academic centers (UW Medicine, Swedish) are within an hour for tertiary needs.',
    },
    climate: {
      summerAvgHighF: 78, winterAvgLowF: 36, fourSeasonVariation: 3,
      summerHeatIntensity: 1, summerHumidityLevel: 2, winterSeverityScore: 2, avgAnnualSnowfallInches: 6,
    },
    travel: {
      nearestMajorAirport: 'Seattle-Tacoma Intl (SEA)', driveTimeMinutes: 45,
      airportConnectivityScore: 92, nonstopEurope: true, nonstopSouthAmerica: false,
      secondaryAirport: null,
      europeConnectivityScore: 90, southAmericaConnectivityScore: 40,
      oneStopUsefulnessNote: 'VERIFIED this session (Delta News Hub, Port of Seattle, Aviation Week): SEA has a rapidly expanding Europe network — Delta flies Amsterdam, London, Paris, Rome, and Barcelona; Alaska independently added London, Rome, Paris, and Athens in 2026; Icelandair serves Reykjavik. Genuinely one of the strongest non-coastal-hub Europe networks in the country. No confirmed nonstop South America route.'
    },
    lifestyle: { amenitiesScore: 78, walkabilityScore: 52 },
    risk: { resilienceScore: 68, primaryRisks: ['earthquake', 'wildfire smoke (regional)'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset WA Property Tax Calculator — Thurston County effective rate (0.81%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'PNWResidences.com 2026 — WA statewide avg ~$1,753/yr, among the lowest-cost insurance states', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Delta News Hub / Port of Seattle / Aviation Week \u2014 VERIFIED this session: SEA nonstop Europe network (Delta: Amsterdam, London, Paris, Rome, Barcelona; Alaska: London, Rome, Paris, Athens; Icelandair: Reykjavik), no confirmed South America nonstop', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA/USGS hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Jacksonville/North Florida': {
    state: 'Florida',
    slug: 'jacksonville-north-florida',
    region: 'Southeast',
    characterTag: 'metro/suburban',
    geographyProxyNote: 'Housing/cost figures represent Jacksonville proper (Duval County).',
    housing: {
      typicalHomeValue: 340000,
      typicalRent2BR: 1600,
      propertyTaxRate: 0.0077,
      homeownersInsuranceAnnual: 3800, // FL property insurance is a known outlier — kept high deliberately, now upgraded with 2026 statewide sourcing
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 200, groceries: 400, transportation: 190 },
    autoInsuranceAnnual: 1900,
    healthcare: {
      medicareAdvantageMarketQuality: 'excellent',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 190,
      partDMonthlyEstimate: 48,
      acaRatingArea: 'FL Rating Area 3 (Duval County)',
      acaBenchmarkPremiumAge21: 380,
      healthSystemNote: 'Mayo Clinic Florida, Baptist Health, and UF Health Jacksonville together give this metro an unusually deep tertiary/academic bench for its size.',
    },
    climate: {
      summerAvgHighF: 92, winterAvgLowF: 42, fourSeasonVariation: 1,
      summerHeatIntensity: 5, summerHumidityLevel: 5, winterSeverityScore: 1, avgAnnualSnowfallInches: 0,
    },
    travel: {
      nearestMajorAirport: 'Jacksonville International (JAX)', driveTimeMinutes: 25,
      airportConnectivityScore: 60, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Orlando Intl (MCO), ~2hr drive',
      europeConnectivityScore: 30, southAmericaConnectivityScore: 35,
      oneStopUsefulnessNote: 'JAX has solid domestic service but no international nonstops; MCO (a strong Latin America gateway) is a reasonable drive for South America travel specifically.',
    },
    lifestyle: { amenitiesScore: 64, walkabilityScore: 38 },
    risk: { resilienceScore: 52, primaryRisks: ['hurricane', 'coastal flooding', 'inland flooding'] },
    sources: {
      housing: { source: 'Planning estimate, pre-checkpoint — not re-verified this pass', year: 2026, lastVerified: '2026-08-24', confidence: 'medium', method: 'modeled' },
      propertyTax: { source: 'SmartAsset FL Property Tax Calculator — Duval County effective rate (0.77%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com / InsuranceQuotes.com 2026 — FL statewide avg $7,900-8,471/yr, heavily skewed by South FL hurricane exposure; North FL/Duval historically runs well below the state figure', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'CMS/general market-quality estimate (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections.com / Directflights.com — VERIFIED this session: JAX has no international nonstop service (confirmed all-domestic route list, 49 destinations); strongest hub connections are ATL, ORD, DFW, CLT', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge (planning)', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  // -------------------------------------------------------------------
  // 12 new metros added this checkpoint. Home values are HIGH confidence
  // (live Zillow ZHVI search, this session, ~July/Aug 2026). Everything
  // else follows the same MEDIUM-confidence documented-methodology
  // approach as the original 7 — see the file-level comment above.
  // -------------------------------------------------------------------

  'Asheville, NC': {
    state: 'North Carolina',
    slug: 'asheville-nc',
    region: 'Southeast (Appalachian)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Asheville city proper (Buncombe County). Elevation (~2,100ft) meaningfully moderates Southeast heat/humidity relative to lowland Carolina/Georgia metros in this set.',
    housing: {
      typicalHomeValue: 462044,
      typicalRent2BR: 1650,
      propertyTaxRate: 0.0061,
      homeownersInsuranceAnnual: 1500,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 200, groceries: 420, transportation: 180 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 150,
      partDMonthlyEstimate: 43,
      acaRatingArea: 'NC Rating Area 3 (Buncombe County)',
      acaBenchmarkPremiumAge21: 330,
      healthSystemNote: 'Mission Hospital (HCA-owned regional referral center) is the main system; it is itself the specialty-care hub for western NC, so residents don\u2019t typically need to travel further for most tertiary needs.',
    },
    climate: {
      summerAvgHighF: 84, winterAvgLowF: 28, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 2, avgAnnualSnowfallInches: 12,
    },
    travel: {
      nearestMajorAirport: 'Asheville Regional (AVL)', driveTimeMinutes: 25,
      airportConnectivityScore: 50, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Charlotte Douglas Intl (CLT), ~2hr drive',
      europeConnectivityScore: 35, southAmericaConnectivityScore: 25,
      oneStopUsefulnessNote: 'AVL has no international nonstops; CLT (American\u2019s hub) is about 2 hours away and provides good one-stop access to Europe and Latin America.',
    },
    lifestyle: { amenitiesScore: 74, walkabilityScore: 58 },
    risk: {
      resilienceScore: 68,
      primaryRisks: ['inland flooding', 'landslide (mountain terrain)', 'winter storm'],
      // Note: western NC, including the Asheville area, experienced severe
      // inland flooding from Hurricane Helene's remnants in September 2024 —
      // a reminder that "mountain metro" does not mean "no flood risk."
    },
    sources: {
      housing: { source: 'Zillow Home Value Index — Asheville, NC', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset NC Property Tax Calculator — Buncombe County effective rate (0.61%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — NC statewide avg ~$2,900/yr blends cheap inland with expensive coastal NC; mountain Asheville has low wind/hurricane exposure', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Southeast small-metro baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'HCA/Mission Hospital general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for AVL station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections.com / Directflights.com — VERIFIED this session: AVL has no international nonstop service (confirmed all-domestic route list, 26 destinations, all US); CLT ~2hr drive is the practical international gateway', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge, incl. Sept. 2024 Helene flooding', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Greenville/Upstate, SC': {
    state: 'South Carolina',
    slug: 'greenville-upstate-sc',
    region: 'Southeast (Piedmont)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Greenville city proper — NOT the broader Greenville-Anderson-Mauldin metro or the full "Upstate" region, which includes more rural, generally cheaper areas.',
    housing: {
      typicalHomeValue: 330858,
      typicalRent2BR: 1550,
      propertyTaxRate: 0.0048,
      homeownersInsuranceAnnual: 1700,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 190, groceries: 400, transportation: 175 },
    autoInsuranceAnnual: 1250,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 145,
      partDMonthlyEstimate: 41,
      acaRatingArea: 'SC Rating Area 4 (Greenville County)',
      acaBenchmarkPremiumAge21: 310,
      healthSystemNote: 'Prisma Health Greenville Memorial is a large regional academic-affiliated medical center serving the entire Upstate.',
    },
    climate: {
      summerAvgHighF: 89, winterAvgLowF: 33, fourSeasonVariation: 3,
      summerHeatIntensity: 3, summerHumidityLevel: 4, winterSeverityScore: 1, avgAnnualSnowfallInches: 3,
    },
    travel: {
      nearestMajorAirport: 'Greenville-Spartanburg Intl (GSP)', driveTimeMinutes: 20,
      airportConnectivityScore: 48, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Charlotte Douglas Intl (CLT), ~1hr drive',
      europeConnectivityScore: 32, southAmericaConnectivityScore: 22,
      oneStopUsefulnessNote: 'GSP has limited direct service; CLT about an hour away provides strong one-stop international access via American\u2019s hub.',
    },
    lifestyle: { amenitiesScore: 68, walkabilityScore: 55 },
    risk: { resilienceScore: 76, primaryRisks: ['inland flooding', 'severe thunderstorm/hail', 'tropical storm remnants'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Greenville, SC', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset SC Property Tax Calculator — Greenville County effective rate (0.48%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — SC statewide avg ~$2,800/yr is coastal-hurricane-driven; inland Upstate SC well below the state figure', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Southeast small-metro baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Prisma Health general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for GSP station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (GSP/CLT) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Chattanooga, TN': {
    state: 'Tennessee',
    slug: 'chattanooga-tn',
    region: 'Southeast (Tennessee Valley)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Chattanooga city proper (Hamilton County). Tennessee has no state income tax.',
    housing: {
      typicalHomeValue: 322295,
      typicalRent2BR: 1450,
      propertyTaxRate: 0.0055,
      homeownersInsuranceAnnual: 2000,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 195, groceries: 390, transportation: 175 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 5,
      medigapMonthlyEstimate: 145,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'TN Rating Area 3 (Hamilton County)',
      acaBenchmarkPremiumAge21: 350,
      healthSystemNote: 'Erlanger Health System (the region\u2019s academic/Level I trauma center) and CHI Memorial anchor care locally.',
    },
    climate: {
      summerAvgHighF: 89, winterAvgLowF: 32, fourSeasonVariation: 4,
      summerHeatIntensity: 3, summerHumidityLevel: 4, winterSeverityScore: 1, avgAnnualSnowfallInches: 4,
    },
    travel: {
      nearestMajorAirport: 'Chattanooga Metro (CHA)', driveTimeMinutes: 20,
      airportConnectivityScore: 45, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Hartsfield-Jackson Atlanta Intl (ATL), ~2hr drive',
      europeConnectivityScore: 40, southAmericaConnectivityScore: 40,
      oneStopUsefulnessNote: 'CHA offers domestic-only service, but ATL — Delta\u2019s primary global hub and one of the world\u2019s best-connected airports — is a manageable ~2hr drive.',
    },
    lifestyle: { amenitiesScore: 70, walkabilityScore: 56 },
    risk: { resilienceScore: 75, primaryRisks: ['inland flooding', 'tornado/hail', 'severe thunderstorm'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Chattanooga, TN', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset TN Property Tax Calculator — Hamilton County effective rate (0.55%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — TN statewide avg ~$2,700/yr, driven by severe convective storm/tornado risk', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Southeast small-metro baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Erlanger/CHI Memorial general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for CHA station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (CHA/ATL) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'San Antonio/Hill Country, TX': {
    state: 'Texas',
    slug: 'san-antonio-hill-country-tx',
    region: 'South/Central Texas',
    characterTag: 'urban',
    geographyProxyNote: 'IMPORTANT: housing/cost figures represent San Antonio CITY proper. True Hill Country towns (Boerne, Kerrville, Fredericksburg) generally cost more than this city-wide average — this proxy likely UNDERSTATES cost for a buyer specifically targeting the Hill Country rather than San Antonio itself.',
    housing: {
      typicalHomeValue: 251065,
      typicalRent2BR: 1350,
      propertyTaxRate: 0.0154,
      homeownersInsuranceAnnual: 3200,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 210, groceries: 380, transportation: 180 },
    autoInsuranceAnnual: 1500,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 150,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'TX Rating Area 3 (Bexar County)',
      acaBenchmarkPremiumAge21: 300,
      healthSystemNote: 'University Health System and Methodist Healthcare provide broad academic/tertiary care; San Antonio is itself the referral hub for much of South/Central Texas including the Hill Country.',
    },
    climate: {
      summerAvgHighF: 95, winterAvgLowF: 40, fourSeasonVariation: 1,
      summerHeatIntensity: 5, summerHumidityLevel: 3, winterSeverityScore: 1, avgAnnualSnowfallInches: 0,
    },
    travel: {
      nearestMajorAirport: 'San Antonio Intl (SAT)', driveTimeMinutes: 20,
      airportConnectivityScore: 55, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Austin-Bergstrom Intl (AUS), ~1.5hr drive',
      europeConnectivityScore: 35, southAmericaConnectivityScore: 25,
      oneStopUsefulnessNote: 'VERIFIED this session (FlightConnections/FlightsFrom): SAT has a genuinely extensive Mexico network - nonstop Cancun, Mexico City, Monterrey, Guadalajara, Queretaro, San Luis Potosi, Leon, Torreon. CORRECTED: this is Mexico/Latin America access, not South America - no confirmed nonstop South America route from SAT, and the earlier estimate overstated South America usefulness by conflating the two. One-stop South America access exists via Houston (IAH, a major Latin America gateway) but that is a further drive, not local.',
    },
    lifestyle: { amenitiesScore: 66, walkabilityScore: 48 },
    risk: { resilienceScore: 68, primaryRisks: ['extreme heat', 'drought/water stress', 'severe hail', 'flash flooding'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — San Antonio, TX', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset TX Property Tax Calculator — Bexar County effective rate (derived 1.54% from $4,381 median bill / $284,400 median value)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com / NerdWallet 2026 — TX statewide avg ~$4,800-4,900/yr (hail + hurricane); San Antonio is inland from the Gulf but has major hail exposure', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, South Texas baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'University Health/Methodist general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for SAT station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections/FlightsFrom \u2014 VERIFIED this session: SAT itself has an extensive Mexico network but no South America service; South America credit depends on a further IAH drive, kept Medium', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Tucson, AZ': {
    state: 'Arizona',
    slug: 'tucson-az',
    region: 'Southwest (Sonoran Desert)',
    characterTag: 'urban',
    geographyProxyNote: 'Housing/cost figures represent Tucson city proper (Pima County).',
    housing: {
      typicalHomeValue: 325520,
      typicalRent2BR: 1250,
      propertyTaxRate: 0.0065,
      homeownersInsuranceAnnual: 1900,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 230, groceries: 380, transportation: 170 },
    autoInsuranceAnnual: 1350,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 0,
      medigapMonthlyEstimate: 145,
      partDMonthlyEstimate: 40,
      acaRatingArea: 'AZ Rating Area 1 (Pima County)',
      acaBenchmarkPremiumAge21: 290,
      healthSystemNote: 'Banner-University Medical Center Tucson (academic/tertiary, University of Arizona affiliate) and TMC HealthCare give this metro a strong healthcare market for its size.',
    },
    climate: {
      summerAvgHighF: 100, winterAvgLowF: 40, fourSeasonVariation: 1,
      summerHeatIntensity: 5, summerHumidityLevel: 1, winterSeverityScore: 1, avgAnnualSnowfallInches: 1,
    },
    travel: {
      nearestMajorAirport: 'Tucson Intl (TUS)', driveTimeMinutes: 20,
      airportConnectivityScore: 42, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Phoenix Sky Harbor Intl (PHX), ~1.5-2hr drive',
      europeConnectivityScore: 35, southAmericaConnectivityScore: 25,
      oneStopUsefulnessNote: 'VERIFIED this session: TUS itself is domestic-only (19-35 destinations, confirmed no international nonstops). PHX (American\'s hub, with genuine nonstop London and Frankfurt service) is 1.5-2hr away - real credit given but meaningfully discounted for the drive, not treated as equivalent to living near PHX.',
    },
    lifestyle: { amenitiesScore: 68, walkabilityScore: 46 },
    risk: { resilienceScore: 66, primaryRisks: ['extreme heat', 'drought/water stress', 'wildfire (surrounding areas)'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Tucson, AZ', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset AZ Property Tax Calculator — Pima County effective rate (0.65%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — AZ statewide avg ~$2,250/yr', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Southwest desert baseline (AC-heavy utilities)', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Banner/TMC general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for TUS station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections/FlightsFrom \u2014 VERIFIED this session: TUS domestic-only confirmed; PHX Europe credit (London, Frankfurt) discounted for the 1.5-2hr drive, kept Medium', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Santa Fe/Albuquerque, NM': {
    state: 'New Mexico',
    slug: 'santa-fe-albuquerque-nm',
    region: 'Southwest (High Desert)',
    characterTag: 'urban',
    geographyProxyNote: 'FLAGGED PER GEOGRAPHY RULE: Santa Fe (Zillow ZHVI $570,886) and Albuquerque ($350,091) differ by roughly 63% in typical home value — too material to average into one fictional location. This v1 record uses ALBUQUERQUE for every field (larger population, has the region\u2019s international airport, more representative relocation target). Santa Fe is meaningfully more expensive and culturally distinct; it should become its OWN metro record in a future data pass rather than being assumed equivalent to Albuquerque.',
    housing: {
      typicalHomeValue: 350091,
      typicalRent2BR: 1250,
      propertyTaxRate: 0.0084,
      homeownersInsuranceAnnual: 1300,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 200, groceries: 380, transportation: 175 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 5,
      medigapMonthlyEstimate: 150,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'NM Rating Area 1 (Bernalillo County)',
      acaBenchmarkPremiumAge21: 300,
      healthSystemNote: 'University of New Mexico Hospital (the state\u2019s only academic/Level I trauma center) and Presbyterian Healthcare Services anchor care for the whole state, including Santa Fe.',
    },
    climate: {
      summerAvgHighF: 91, winterAvgLowF: 27, fourSeasonVariation: 3,
      summerHeatIntensity: 4, summerHumidityLevel: 1, winterSeverityScore: 2, avgAnnualSnowfallInches: 10,
    },
    travel: {
      nearestMajorAirport: 'Albuquerque Intl Sunport (ABQ)', driveTimeMinutes: 20,
      airportConnectivityScore: 45, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: null,
      europeConnectivityScore: 28, southAmericaConnectivityScore: 22,
      oneStopUsefulnessNote: 'ABQ has solid domestic connectivity but no international nonstops; international travel requires a one-stop via Dallas, Denver, or Phoenix.',
    },
    lifestyle: { amenitiesScore: 66, walkabilityScore: 44 },
    risk: { resilienceScore: 70, primaryRisks: ['drought/water stress', 'wildfire (regional)', 'extreme heat'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Albuquerque, NM (Santa Fe checked separately: $570,886 — see geography note)', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset NM Property Tax Calculator — Bernalillo County effective rate (0.84%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'HomeInsureCalc.com 2026 — NM statewide avg ~$1,100/yr, one of the lower-cost insurance states', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, high-desert Southwest baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'UNM Hospital/Presbyterian general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for ABQ station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'FlightConnections.com — VERIFIED this session: ABQ has no international nonstop service (confirmed route list dominated by DEN/PHX/DFW/domestic hub connections)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Colorado Springs, CO': {
    state: 'Colorado',
    slug: 'colorado-springs-co',
    region: 'Mountain West (Front Range)',
    characterTag: 'urban',
    geographyProxyNote: 'Housing/cost figures represent Colorado Springs city proper (El Paso County).',
    housing: {
      typicalHomeValue: 455897,
      typicalRent2BR: 1600,
      propertyTaxRate: 0.0043,
      homeownersInsuranceAnnual: 3000,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 190, groceries: 400, transportation: 180 },
    autoInsuranceAnnual: 1450,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 155,
      partDMonthlyEstimate: 43,
      acaRatingArea: 'CO Rating Area 7 (El Paso County)',
      acaBenchmarkPremiumAge21: 280,
      healthSystemNote: 'UCHealth Memorial Hospital and Centura Health anchor a strong regional system; some highly specialized tertiary care still routes to Denver, about an hour away.',
    },
    climate: {
      summerAvgHighF: 85, winterAvgLowF: 21, fourSeasonVariation: 4,
      summerHeatIntensity: 2, summerHumidityLevel: 1, winterSeverityScore: 3, avgAnnualSnowfallInches: 42,
    },
    travel: {
      nearestMajorAirport: 'Colorado Springs Airport (COS)', driveTimeMinutes: 20,
      airportConnectivityScore: 50, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Denver Intl (DEN), ~75 min drive',
      europeConnectivityScore: 48, southAmericaConnectivityScore: 28,
      oneStopUsefulnessNote: 'VERIFIED this session (Denver International Airport official route map): COS itself is domestic-only (17 destinations, confirmed). DEN has a genuinely strong Europe network (Dublin, Istanbul, London, Frankfurt, Munich, Paris, Reykjavik, Rome) plus extensive Mexico service \u2014 real credit given, discounted for the ~75-minute drive rather than scored as if COS were DEN itself.',
    },
    lifestyle: { amenitiesScore: 70, walkabilityScore: 46 },
    risk: { resilienceScore: 65, primaryRisks: ['wildfire', 'severe hail', 'drought/water stress', 'flooding (burn-scar areas)'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Colorado Springs, CO', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset CO Property Tax Calculator — El Paso County effective rate (0.43%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — CO statewide avg ~$4,400/yr, among the highest nationally, hail-driven; Colorado Springs sits in the Front Range "hail alley" so likely tracks near rather than below the state average', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Front Range baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'UCHealth/Centura general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for COS station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Denver Intl official route map \u2014 VERIFIED this session: COS domestic-only confirmed; DEN\u2019s strong Europe network credited but discounted for the 75-min drive, kept Medium', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge — Front Range hail alley + wildland-urban interface wildfire exposure', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Savannah, GA': {
    state: 'Georgia',
    slug: 'savannah-ga',
    region: 'Southeast (Coastal)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Savannah city proper (Chatham County).',
    housing: {
      typicalHomeValue: 335719,
      typicalRent2BR: 1550,
      propertyTaxRate: 0.0085,
      homeownersInsuranceAnnual: 2900,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 210, groceries: 390, transportation: 175 },
    autoInsuranceAnnual: 1500,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 5,
      medigapMonthlyEstimate: 160,
      partDMonthlyEstimate: 44,
      acaRatingArea: 'GA Rating Area 11 (Chatham County)',
      acaBenchmarkPremiumAge21: 340,
      healthSystemNote: 'Memorial Health University Medical Center (Level I trauma, academic affiliate) is the main referral center for coastal Georgia and the SC Lowcountry.',
    },
    climate: {
      summerAvgHighF: 91, winterAvgLowF: 40, fourSeasonVariation: 1,
      summerHeatIntensity: 4, summerHumidityLevel: 5, winterSeverityScore: 1, avgAnnualSnowfallInches: 0,
    },
    travel: {
      nearestMajorAirport: 'Savannah/Hilton Head Intl (SAV)', driveTimeMinutes: 20,
      airportConnectivityScore: 40, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Hartsfield-Jackson Atlanta Intl (ATL), ~4hr drive',
      europeConnectivityScore: 22, southAmericaConnectivityScore: 20,
      oneStopUsefulnessNote: 'SAV offers only domestic nonstops; international travel requires connecting through Atlanta or Charlotte, practically via a short flight rather than the long drive to ATL.',
    },
    lifestyle: { amenitiesScore: 76, walkabilityScore: 62 },
    risk: { resilienceScore: 54, primaryRisks: ['hurricane', 'coastal flooding', 'storm surge'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Savannah, GA', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'Best-available estimate — GA statewide effective rate ~0.74-0.9% (SmartAsset); Chatham County-specific rate not cleanly isolated this pass', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      insurance: { source: 'InsuranceCostCity.com 2026 — GA statewide avg ~$2,500/yr; coastal Chatham County likely runs above the state average', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, coastal Southeast baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Memorial Health general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for SAV station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (SAV/ATL) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hurricane-exposure hazard general knowledge, direct Atlantic coastal exposure', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Roanoke/Shenandoah Valley, VA': {
    state: 'Virginia',
    slug: 'roanoke-shenandoah-valley-va',
    region: 'Mid-Atlantic (Appalachian)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Roanoke city proper. Shenandoah Valley towns further north (Staunton, Harrisonburg, Winchester) may differ modestly in cost; Roanoke is used as the regional anchor/proxy for this combined listing.',
    housing: {
      typicalHomeValue: 282167,
      typicalRent2BR: 1350,
      propertyTaxRate: 0.0101,
      homeownersInsuranceAnnual: 1300,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 195, groceries: 390, transportation: 175 },
    autoInsuranceAnnual: 1250,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 150,
      partDMonthlyEstimate: 42,
      acaRatingArea: 'VA Rating Area 3 (Roanoke City)',
      acaBenchmarkPremiumAge21: 300,
      healthSystemNote: 'Carilion Clinic (the region\u2019s largest health system, academically affiliated with Virginia Tech) anchors care for a wide swath of southwest Virginia.',
    },
    climate: {
      summerAvgHighF: 86, winterAvgLowF: 27, fourSeasonVariation: 5,
      summerHeatIntensity: 2, summerHumidityLevel: 3, winterSeverityScore: 2, avgAnnualSnowfallInches: 16,
    },
    travel: {
      nearestMajorAirport: 'Roanoke-Blacksburg Regional (ROA)', driveTimeMinutes: 15,
      airportConnectivityScore: 38, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Washington Dulles Intl (IAD), ~3.5hr drive; Charlotte Douglas (CLT), ~3hr drive',
      europeConnectivityScore: 26, southAmericaConnectivityScore: 18,
      oneStopUsefulnessNote: 'ROA has limited regional-jet-only service; nearly all international travel requires a connection via Charlotte or Dulles, generally reached by a short domestic flight rather than a practical drive.',
    },
    lifestyle: { amenitiesScore: 60, walkabilityScore: 44 },
    risk: { resilienceScore: 78, primaryRisks: ['inland flooding', 'winter storm', 'severe thunderstorm'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Roanoke, VA', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'TaxByCounty.com — Roanoke CITY effective rate (1.01%), distinct from and higher than surrounding Roanoke County (0.88%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — VA statewide avg ~$2,100/yr; inland VA runs below coastal VA (Hampton Roads hurricane exposure)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Appalachian Virginia baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Carilion Clinic general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for ROA station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (ROA/CLT/IAD) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Bend, OR': {
    state: 'Oregon',
    slug: 'bend-or',
    region: 'Pacific Northwest (High Desert)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Bend city proper (Deschutes County) — the most expensive metro in this 19-metro launch set.',
    housing: {
      typicalHomeValue: 726400,
      typicalRent2BR: 1900,
      propertyTaxRate: 0.0082,
      homeownersInsuranceAnnual: 1400,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 190, groceries: 430, transportation: 190 },
    autoInsuranceAnnual: 1300,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 10,
      medigapMonthlyEstimate: 165,
      partDMonthlyEstimate: 45,
      acaRatingArea: 'OR Rating Area 7 (Deschutes County)',
      acaBenchmarkPremiumAge21: 320,
      healthSystemNote: 'St. Charles Health System is the dominant regional provider; some highly specialized tertiary care still routes to Portland, about 3 hours away.',
    },
    climate: {
      summerAvgHighF: 82, winterAvgLowF: 25, fourSeasonVariation: 4,
      summerHeatIntensity: 2, summerHumidityLevel: 1, winterSeverityScore: 3, avgAnnualSnowfallInches: 25,
    },
    travel: {
      nearestMajorAirport: 'Redmond Municipal/Roberts Field (RDM)', driveTimeMinutes: 25,
      airportConnectivityScore: 35, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Portland Intl (PDX), ~3hr drive',
      europeConnectivityScore: 25, southAmericaConnectivityScore: 15,
      oneStopUsefulnessNote: 'RDM offers growing but still limited domestic service (mostly West Coast hubs); PDX, roughly 3 hours away, is the practical gateway for international nonstops.',
    },
    lifestyle: { amenitiesScore: 78, walkabilityScore: 52 },
    risk: { resilienceScore: 60, primaryRisks: ['wildfire', 'wildfire smoke', 'drought/water stress'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Bend, OR', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset OR Property Tax Calculator — Deschutes County effective rate (0.82%)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'HomeInsureCalc.com 2026 — OR statewide avg ~$1,200-1,350/yr; Bend\'s wildfire exposure keeps it near/above the state average', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, Central Oregon baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'St. Charles Health System general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for RDM/Bend station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (RDM/PDX) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/USFS wildfire-exposure hazard general knowledge, Central Oregon wildfire/smoke season', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Reno, NV': {
    state: 'Nevada',
    slug: 'reno-nv',
    region: 'Mountain West (High Desert)',
    characterTag: 'urban',
    geographyProxyNote: 'Housing/cost figures represent Reno city proper (Washoe County).',
    housing: {
      typicalHomeValue: 576913,
      typicalRent2BR: 1650,
      propertyTaxRate: 0.0048,
      homeownersInsuranceAnnual: 1300,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 180, groceries: 400, transportation: 180 },
    autoInsuranceAnnual: 1400,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 5,
      medigapMonthlyEstimate: 155,
      partDMonthlyEstimate: 43,
      acaRatingArea: 'NV Rating Area 2 (Washoe County)',
      acaBenchmarkPremiumAge21: 310,
      healthSystemNote: 'Renown Health (the region\u2019s only academic/Level II trauma center) is the dominant provider; some tertiary specialty care routes to Sacramento or the Bay Area, 2-3.5 hours away.',
    },
    climate: {
      summerAvgHighF: 90, winterAvgLowF: 25, fourSeasonVariation: 4,
      summerHeatIntensity: 3, summerHumidityLevel: 1, winterSeverityScore: 3, avgAnnualSnowfallInches: 22,
    },
    travel: {
      nearestMajorAirport: 'Reno-Tahoe Intl (RNO)', driveTimeMinutes: 15,
      airportConnectivityScore: 48, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'San Francisco Intl (SFO), ~3.5hr drive',
      europeConnectivityScore: 28, southAmericaConnectivityScore: 18,
      oneStopUsefulnessNote: 'VERIFIED this session (RenoAirport.com official route map): RNO is domestic-only (20+ nonstop destinations, all North America, confirmed via the airport\'s own published route list). SFO (~3.5hr drive) remains the realistic international gateway - a longer drive than most peer metros gateways, discounted accordingly.',
    },
    lifestyle: { amenitiesScore: 68, walkabilityScore: 48 },
    risk: { resilienceScore: 60, primaryRisks: ['wildfire', 'wildfire smoke', 'drought/water stress', 'earthquake'] },
    sources: {
      housing: { source: 'Zillow Home Value Index — Reno, NV', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset NV Property Tax Calculator / USPropertyTax.org — Washoe County effective rate (0.48%, multiple sources agree)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'Multiple 2026 sources — NV statewide avg ~$1,200-1,300/yr, dry climate keeps costs low', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, high-desert Mountain West baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Renown Health general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for RNO station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'RenoAirport.com official route map \u2014 VERIFIED this session: RNO domestic-only confirmed; SFO gateway credit discounted for the 3.5hr drive, kept Medium', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/USFS wildfire and USGS seismic hazard general knowledge', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },

  'Wilmington/Southern NC coast': {
    state: 'North Carolina',
    slug: 'wilmington-southern-nc-coast',
    region: 'Southeast (Coastal)',
    characterTag: 'small metro',
    geographyProxyNote: 'Housing/cost figures represent Wilmington city proper (New Hanover County).',
    housing: {
      typicalHomeValue: 419326,
      typicalRent2BR: 1650,
      propertyTaxRate: 0.0062,
      homeownersInsuranceAnnual: 3400,
      homeMaintenancePctAnnual: 0.015,
    },
    living: { utilities: 205, groceries: 400, transportation: 180 },
    autoInsuranceAnnual: 1400,
    healthcare: {
      medicareAdvantageMarketQuality: 'good',
      medicareAdvantageMonthlyEstimate: 5,
      medigapMonthlyEstimate: 155,
      partDMonthlyEstimate: 43,
      acaRatingArea: 'NC Rating Area 6 (New Hanover County)',
      acaBenchmarkPremiumAge21: 335,
      healthSystemNote: 'Novant Health New Hanover Regional Medical Center is the main coastal-NC referral hospital; broader academic/tertiary care routes to Duke or UNC Chapel Hill, about 2.5 hours away.',
    },
    climate: {
      summerAvgHighF: 89, winterAvgLowF: 38, fourSeasonVariation: 2,
      summerHeatIntensity: 4, summerHumidityLevel: 5, winterSeverityScore: 1, avgAnnualSnowfallInches: 1,
    },
    travel: {
      nearestMajorAirport: 'Wilmington Intl (ILM)', driveTimeMinutes: 15,
      airportConnectivityScore: 38, nonstopEurope: false, nonstopSouthAmerica: false,
      secondaryAirport: 'Raleigh-Durham Intl (RDU), ~2.5hr drive; Charlotte Douglas (CLT), ~3.25hr drive',
      europeConnectivityScore: 24, southAmericaConnectivityScore: 18,
      oneStopUsefulnessNote: 'ILM offers only domestic regional-jet service; international travel requires connecting through RDU or CLT, generally via a short domestic flight.',
    },
    lifestyle: { amenitiesScore: 72, walkabilityScore: 58 },
    risk: {
      resilienceScore: 50,
      primaryRisks: ['hurricane', 'coastal flooding', 'storm surge', 'inland flooding (Cape Fear River)'],
      // Note: Wilmington took a direct, damaging hit from Hurricane Florence
      // in September 2018 — among the lowest resilience scores in this set
      // for exactly that reason, not an oversight.
    },
    sources: {
      housing: { source: 'Zillow Home Value Index — Wilmington, NC', year: 2026, lastVerified: '2026-08-25', confidence: 'high', method: 'sourced' },
      propertyTax: { source: 'SmartAsset NC Property Tax Calculator — New Hanover County effective rate (derived 0.62% from $1,996 median bill / $320,000 median value)', year: 2026, lastVerified: '2026-08-26', confidence: 'high', method: 'sourced' },
      insurance: { source: 'InsuranceCostCity.com 2026 — NC statewide avg ~$2,900/yr blends cheap inland with expensive coastal NC; coastal New Hanover County should run well above the state figure', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      livingCosts: { source: 'Regional cost-pattern estimate, coastal Southeast baseline', year: 2026, confidence: 'medium', method: 'modeled' },
      healthcare: { source: 'Novant Health general market-quality estimate', year: 2026, confidence: 'medium', method: 'modeled' },
      climate: { source: 'NOAA-normal-consistent general knowledge for ILM station', year: 2026, confidence: 'medium', method: 'modeled' },
      travel: { source: 'Airline route general knowledge (ILM/RDU/CLT) — not individually route-verified this pass; pattern-consistent with directly-verified peer regional airports (AVL, JAX both confirmed domestic-only this session)', year: 2026, lastVerified: '2026-08-26', confidence: 'medium', method: 'modeled' },
      risk: { source: 'NOAA/FEMA hurricane-exposure hazard general knowledge, incl. Sept. 2018 Hurricane Florence direct impact', year: 2026, confidence: 'medium', method: 'modeled' },
    },
  },
};
