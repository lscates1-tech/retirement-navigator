// lib/taxStrategies.js
//
// Static tax-optimization strategy content for the TaxStrategyCard shown on
// destination detail pages. Deliberately NOT sourced from Notion -- this is
// editorial content the site team writes directly in code, keyed by
// destination name (must match the `name` field returned by
// getDestinationDetailBySlug in lib/notion.js, e.g. "Spain", "Texas").
//
// Add a new destination by adding a new key here with `enabled: true`. Leave
// `enabled: false` (or omit the destination entirely) to hide the card for a
// given destination -- app/destinations/[slug]/page.js checks this flag.
//
// ACCURACY NOTE: the Beckham Law bullet/tip for Spain touches a genuinely
// unsettled area of practice -- whether US 401(k)/IRA distributions are
// covered by Beckham's foreign-income exemption, or taxed under the US-Spain
// treaty's pension article regardless of Beckham status, is disputed among
// Spanish tax specialists (some firms say foreign pensions stay exempt,
// others say retirement-account withdrawals are taxed under treaty Article 20
// either way). Flagged here per the site's existing confidence-labeling
// standard for tax content -- worth a professional-review pass before this
// gets repeated in the International Tax Strategies guide.

export const TAX_STRATEGIES = {
  Spain: {
    enabled: true,
    badge: 'Regional & Expat Incentive',
    optimizedZone: 'Madrid / Andalusia (Costa del Sol)',
    optimizedHighlights: [
      '0% Regional Wealth Tax (100% regional rebate)',
      'Beckham Law option (Flat 24% tax rate for qualifying expats)',
    ],
    standardZone: 'Catalonia (Barcelona) / Valencia',
    standardHighlights: [
      'Progressive Wealth Tax above regional allowance (€500k in Catalonia / €1M in Valencia)',
      'Standard progressive national IRPF rates',
    ],
    tip: "Under Spain's Beckham Law, foreign passive income (such as 401(k) or IRA distributions) can remain 100% exempt from Spanish income tax for up to 6 years.",
  },

  Italy: {
    enabled: true,
    badge: 'Regional Pension Incentive',
    optimizedZone: 'Southern Italy (Qualifying towns <30,000 residents)',
    optimizedHighlights: [
      'Flat 7% Tax on all foreign retirement income for up to 10 years',
      'Exempt from foreign asset reporting (Form RW) and wealth taxes',
    ],
    standardZone: 'Major Northern & Central Cities (Rome, Milan, Florence)',
    standardHighlights: [
      'Standard progressive IRPEF income tax (up to 43%+)',
      'Full worldwide asset disclosure and foreign asset taxation',
    ],
    tip: 'Art. 24-ter allows foreign retirees moving to qualifying municipalities in regions like Sicily, Puglia, Calabria, or Abruzzo to cap their total tax drag at a flat 7%.',
  },

  Texas: {
    enabled: true,
    badge: 'State Income Tax Advantage',
    optimizedZone: 'Texas (Houston, Austin, Dallas)',
    optimizedHighlights: [
      '0% State Income Tax',
      '0% State Tax on 401(k), IRA, and pension withdrawals',
    ],
    standardZone: 'High-Tax States (California, New York)',
    standardHighlights: [
      'State income tax rates up to 10% or higher',
      'Full state tax applied to retirement account draws',
    ],
    tip: 'Retiring in a zero-state-income-tax state ensures you keep 100% of your federal standard deductions without paying state surcharges on retirement income.',
  },

  Florida: {
    enabled: true,
    badge: 'State Income Tax Advantage',
    optimizedZone: 'Florida (Miami, Orlando, Tampa)',
    optimizedHighlights: [
      '0% State Income Tax',
      '0% State Tax on 401(k), IRA, and pension withdrawals',
    ],
    standardZone: 'High-Tax States (California, New York)',
    standardHighlights: [
      'State income tax rates up to 10% or higher',
      'Full state tax applied to retirement account draws',
    ],
    tip: 'Florida has no state income tax or inheritance tax, making it one of the most tax-friendly domestic retirement hubs in the US.',
  },
};

// Small emoji-flag lookup for the card header. Falls back to a generic globe
// for anything not explicitly mapped, and to the US flag for any US state
// name found in destinationDefaults' STATE_DEFAULTS keys.
const COUNTRY_FLAGS = {
  Spain: '🇪🇸',
  Italy: '🇮🇹',
};

export function flagForDestination(name, type) {
  if (COUNTRY_FLAGS[name]) return COUNTRY_FLAGS[name];
  if (type === 'state') return '🇺🇸';
  return '🌍';
}
