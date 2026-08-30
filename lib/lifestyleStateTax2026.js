/**
 * 2026 state income tax data — scoped specifically to how each state treats
 * RETIREMENT income (Social Security, pensions, IRA/401(k) withdrawals),
 * not general income tax comparison. This distinction matters a great deal
 * for this product's audience: several states with a real income tax fully
 * or partially exempt retirement income (Pennsylvania exempts it entirely),
 * while a "no income tax" badge would miss that a retiree in Pennsylvania
 * can owe less state tax than a retiree in a state that "has no income tax"
 * on capital gains but nothing else, or in a state that taxes retirement
 * income normally. See lifestyleCalculator.js calcStateTax() for how this
 * data is used.
 *
 * SIMPLIFICATIONS (documented, not hidden):
 *   - Every rate below is a single "effective rate applied above the
 *     exemption," not a full bracket walk. For graduated-bracket states,
 *     this uses a representative rate for the income range typical of a
 *     retirement-income household with a meaningful pension/IRA balance —
 *     not the state's lowest bracket, and not always its literal top
 *     bracket if that only applies to very high six-figure incomes.
 *   - Age-based and income-threshold Social Security exemptions (Colorado,
 *     New Mexico) are modeled with a simplified rule rather than the full
 *     statutory phase-out — see calcStateTax() for exactly what's assumed.
 *   - Local/county income taxes (e.g. Ohio municipalities, Pennsylvania
 *     school district taxes) are NOT included — state-level only.
 *   - This does not model federal tax at all.
 *
 * Sources: state Department of Revenue guidance, Tax Foundation 2026 State
 * Income Tax Rates and Brackets, Kiplinger "States That Won't Tax Your
 * Pension" (2026 edition), and Kiplinger "Taxes in Retirement" (2026
 * edition) — cross-checked via live search this session (2026-08-29), not
 * carried forward from training data alone, given how frequently these
 * rules change (Michigan's exemption phase-in only completed for 2026;
 * South Carolina moved to a new two-rate structure for 2026).
 */

export const STATE_TAX_2026 = {
  Pennsylvania: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: Infinity, // pension + IRA/401(k) fully exempt after age 59.5
    retirementIncomeExemptionMarriedAnnual: Infinity,
    effectiveRate: 0.0307,
    source: 'PA Dept. of Revenue; Kiplinger "States That Won\u2019t Tax Your Pension" 2026',
    year: 2026,
    confidence: 'high',
    note: 'Social Security, employer pensions, and IRA/401(k) distributions taken after age 59.5 are fully exempt from PA personal income tax. The 3.07% flat rate only applies to income sources without a specific exemption (e.g. wages, early retirement-account withdrawals).',
  },
  Michigan: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 65987,
    retirementIncomeExemptionMarriedAnnual: 131794,
    effectiveRate: 0.0405,
    source: 'MI Dept. of Treasury; Public Act 4 of 2023 phase-in (complete for 2026 tax year)',
    year: 2026,
    confidence: 'high',
    note: 'Michigan completed its multi-year phase-out of tax on pension/retirement account income for the 2026 tax year. Social Security is separately exempt. Above the exemption, retirement income is taxed at the flat 4.05% rate.',
  },
  Washington: { hasIncomeTax: false, source: 'No state personal income tax', year: 2026, confidence: 'high', note: 'Washington has no personal income tax. (It does have a capital-gains tax on high investment gains, not modeled here since it does not affect ordinary retirement income sources.)' },
  Florida: { hasIncomeTax: false, source: 'No state personal income tax', year: 2026, confidence: 'high', note: 'No state personal income tax of any kind.' },
  Tennessee: { hasIncomeTax: false, source: 'No state personal income tax', year: 2026, confidence: 'high', note: 'No state personal income tax of any kind.' },
  Texas: { hasIncomeTax: false, source: 'No state personal income tax', year: 2026, confidence: 'high', note: 'No state personal income tax of any kind.' },
  Nevada: { hasIncomeTax: false, source: 'No state personal income tax', year: 2026, confidence: 'high', note: 'No state personal income tax of any kind.' },
  'North Carolina': {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 0,
    retirementIncomeExemptionMarriedAnnual: 0,
    effectiveRate: 0.0399,
    source: 'NC Gen. Stat. \u00a7 105-153.7; Tax Foundation 2026 State Income Tax Rates',
    year: 2026,
    confidence: 'high',
    note: 'Social Security is exempt, but North Carolina has no blanket exemption for pension or IRA/401(k) income (unlike Pennsylvania or Michigan) — that income is taxed at the flat 3.99% rate like any other income.',
  },
  'South Carolina': {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 10000,
    retirementIncomeExemptionMarriedAnnual: 20000,
    effectiveRate: 0.0521,
    source: 'SC Act 110 / H.4216 (2026 two-rate restructuring); planning-estimate exemption figure',
    year: 2026,
    confidence: 'medium',
    note: 'Social Security is exempt. SC has historically offered a retirement-income deduction for age 65+; the exact current dollar figure under the 2026 restructuring was not cleanly isolated this session, so this uses a conservative planning estimate rather than a verified statutory figure — flagged as the one state in this table without a directly-sourced exemption amount.',
  },
  Arizona: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 0,
    retirementIncomeExemptionMarriedAnnual: 0,
    effectiveRate: 0.025,
    source: 'AZ Dept. of Revenue; Tax Foundation 2026 (2.5% flat)',
    year: 2026,
    confidence: 'high',
    note: 'Social Security is exempt. Private pension and IRA/401(k) income has no broad exemption (a small exclusion exists for some government pensions, not modeled here) and is taxed at the flat 2.5% rate — the lowest flat rate of any income-tax state in this launch set.',
  },
  'New Mexico': {
    hasIncomeTax: true,
    ssTaxable: 'income-threshold',
    ssExemptionThresholdSingle: 100000,
    ssExemptionThresholdMarried: 150000,
    retirementIncomeExemptionSingleAnnual: 0,
    retirementIncomeExemptionMarriedAnnual: 0,
    effectiveRate: 0.049,
    source: 'NM Taxation & Revenue Dept.; multiple 2026 SS-tax-by-state guides',
    year: 2026,
    confidence: 'medium',
    note: 'One of only 8 states that still taxes Social Security, though it is exempt below an AGI threshold (this model uses total household income as a simplified proxy for that threshold test, not full statutory AGI). Pension/IRA income has no separate exemption.',
  },
  Colorado: {
    hasIncomeTax: true,
    ssTaxable: 'age-based-65-exempt',
    retirementIncomeExemptionSingleAnnual: 24000,
    retirementIncomeExemptionMarriedAnnual: 24000, // per-taxpayer in practice; modeled at the household level here as a simplification
    effectiveRate: 0.044,
    source: 'CO Dept. of Revenue; 2025 law change extending full SS exemption to age 65+',
    year: 2026,
    confidence: 'medium',
    note: 'Social Security is fully exempt for taxpayers 65 and older (a 2025 law change) — this model assumes exemption applies once the youngest household member reaches 65; a genuinely mixed-age household would need to check the age-55-64 partial exemption separately, which isn\u2019t modeled. An additional $24,000 combined SS/pension exemption applies for 65+.',
  },
  Georgia: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 65000,
    retirementIncomeExemptionMarriedAnnual: 130000,
    effectiveRate: 0.0499,
    source: 'GA O.C.G.A. \u00a7 48-7-20 (H.B. 463, 2026 flat-rate cut to 4.99%); GA retirement income exclusion',
    year: 2026,
    confidence: 'high',
    note: 'Social Security is exempt. Georgia offers a substantial retirement-income exclusion (pension, IRA/401(k), and investment income combined) for taxpayers 65+, used here as $65,000 per spouse.',
  },
  Virginia: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 12000,
    retirementIncomeExemptionMarriedAnnual: 24000,
    effectiveRate: 0.0575,
    source: 'VA Dept. of Taxation age deduction; Tax Foundation 2026 (2%-5.75% graduated)',
    year: 2026,
    confidence: 'medium',
    note: 'Social Security is exempt. Virginia\u2019s $12,000-per-person age-65+ deduction phases out above certain income levels — that phase-out is not modeled here, so this may overstate the exemption for higher-income households. Virginia\u2019s top 5.75% bracket begins at a low income threshold, so most retirement income above the exemption is effectively taxed near the top rate.',
  },
  Oregon: {
    hasIncomeTax: true,
    ssTaxable: 'exempt',
    retirementIncomeExemptionSingleAnnual: 0,
    retirementIncomeExemptionMarriedAnnual: 0,
    effectiveRate: 0.0875,
    source: 'OR Rev. Stat. \u00a7 316.037; Tax Foundation 2026 (4.75%-9.9% graduated)',
    year: 2026,
    confidence: 'medium',
    note: 'Social Security is exempt, but Oregon has no meaningful pension/IRA exemption — genuinely one of the least retirement-tax-friendly states in this launch set. Oregon\u2019s brackets compress quickly (the 8.75% rate applies starting around $10,750 single / $21,500 married), so 8.75% is used as the representative effective rate for a household with substantial retirement income, rather than the top 9.9% bracket which only applies above roughly $125,000-$250,000.',
  },
};
