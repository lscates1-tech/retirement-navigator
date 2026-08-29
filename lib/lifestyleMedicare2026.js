/**
 * 2026 Medicare cost figures. Part B is a single national number set by
 * CMS annually — no metro variation. Medigap/Part D/Medicare Advantage
 * premiums DO vary by metro (medical trend, insurer competition, county
 * MA plan availability), so those live on each metro record in the
 * Metros dataset, not here — this file only holds the parts of Medicare
 * pricing that are genuinely national.
 */

export const MEDICARE_2026 = {
  year: 2026,
  source: 'CMS / Federal Register, "Medicare Program; Medicare Part B Monthly Actuarial Rates, Premium Rates, and Annual Deductible Beginning January 1, 2026" (published 11/19/2025)',
  lastVerified: '2026-08-24',
  confidence: 'high — official CMS figure',

  partBStandardMonthlyPremium: 202.90,
  partBAnnualDeductible: 283,

  // IRMAA (income-related monthly adjustment) brackets for 2026, individual
  // filer, based on 2024 MAGI. Not applied automatically in v1 (the
  // calculator doesn't currently collect enough MAGI detail to place a
  // household correctly), but stored here so the calculation layer can pick
  // it up once Step 2 collects the inputs needed to determine bracket.
  irmaaBrackets2026Individual: [
    { magiUpTo: 109000, partBMonthly: 202.90, partDAdjustment: 0 },
    { magiUpTo: 137000, partBMonthly: 284.10, partDAdjustment: 14.50 },
    { magiUpTo: 171000, partBMonthly: 405.80, partDAdjustment: 37.50 },
    { magiUpTo: 205000, partBMonthly: 527.50, partDAdjustment: 60.60 },
    { magiUpTo: 500000, partBMonthly: 649.20, partDAdjustment: 83.60 },
    { magiUpTo: Infinity, partBMonthly: 689.90, partDAdjustment: 91.00 },
  ],

  // National planning-estimate midpoints, used only where a metro record
  // hasn't supplied its own medigapMonthlyEstimate / partDMonthlyEstimate /
  // medicareAdvantageMonthlyEstimate. These are coarse fallbacks, not a
  // source of truth — every metro should carry its own figures before
  // launch, since Medigap in particular varies heavily by state (community
  // rated vs. issue-age rated vs. attained-age rated).
  nationalFallback: {
    medigapPlanGMonthlyEstimate: 165, // planning estimate, Plan G, age ~65-70
    standalonePartDMonthlyEstimate: 46,
    medicareAdvantageMonthlyEstimate: 25, // many MA plans are $0-premium; this is a blended planning estimate
  },
};
