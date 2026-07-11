// Rules-based destination matching. No AI/LLM calls, no ongoing cost —
// everything here runs instantly against data already in Notion, plus a
// small hardcoded climate lookup (climate almost never changes, unlike
// tax/visa data, so it's reasonable to keep in code rather than Notion).

const CLIMATE = {
  // Countries
  Argentina: 'four-seasons', 'Costa Rica': 'tropical', Croatia: 'mediterranean',
  Cyprus: 'mediterranean', Ecuador: 'tropical', France: 'mediterranean',
  Greece: 'mediterranean', Italy: 'mediterranean', Malta: 'mediterranean',
  Mexico: 'mediterranean', Panama: 'tropical', Philippines: 'tropical',
  Portugal: 'mediterranean', Slovenia: 'four-seasons', Spain: 'mediterranean',
  Thailand: 'tropical',
  // States
  Alabama: 'four-seasons', Alaska: 'cold', Arizona: 'tropical', Arkansas: 'four-seasons',
  Colorado: 'cold', Delaware: 'four-seasons', Florida: 'tropical', Georgia: 'four-seasons',
  Idaho: 'cold', Michigan: 'cold', Mississippi: 'four-seasons', Montana: 'cold',
  Nevada: 'tropical', 'New Hampshire': 'cold', 'New Mexico': 'four-seasons',
  'North Carolina': 'four-seasons', Oregon: 'four-seasons', Pennsylvania: 'four-seasons',
  'South Carolina': 'four-seasons', 'South Dakota': 'cold', Tennessee: 'four-seasons',
  Texas: 'tropical', Virginia: 'four-seasons', Washington: 'four-seasons', Wyoming: 'cold',
};

const CLIMATE_LABELS = {
  tropical: 'Tropical / Warm Year-Round',
  mediterranean: 'Mediterranean / Mild Four Seasons',
  'four-seasons': 'Four Seasons / Some Winter',
  cold: 'Cold Winters',
};

const BUDGET_MIDPOINTS = {
  under1500: 1200,
  '1500to2500': 2000,
  '2500to4000': 3250,
  over4000: 5000,
};

// The five pathways this site supports. `locationFilter` tells the
// destination-matching step which type(s) of destination actually make
// sense once a pathway is determined — reusing the existing hard-exclude
// logic in scoreDestination rather than duplicating filtering logic here.
export const PATHWAYS = {
  'retire-abroad': {
    label: 'Retire Abroad',
    description: 'Lower cost of living, real cultural reinvention, and in some countries a genuinely favorable tax regime — at the cost of navigating a visa, foreign tax residency, and a healthcare system you didn\u2019t grow up with.',
    locationFilter: 'abroad',
    guideHref: null,
  },
  'work-remotely': {
    label: 'Work Remotely, From Anywhere',
    description: 'Keep your income, change your zip code — or your country. The tax and visa rules that apply to a paycheck are different from the ones that apply to a pension.',
    locationFilter: 'either',
    guideHref: null,
  },
  'slow-travel': {
    label: 'Slow Travel First',
    description: 'Test a place for a season before you commit to it for a decade — real logistics on visa-free stay limits, healthcare access, and monthly budgets.',
    locationFilter: 'abroad',
    guideHref: '/guides/slow-travel/what-is-slow-travel',
  },
  'tax-rotation': {
    label: 'Rotate to Stay Tax-Free',
    description: 'Never spend enough time in one country to trigger tax residency anywhere — day-count rules and risk levels, mapped out country by country.',
    locationFilter: 'abroad',
    guideHref: '/guides/tax-residency-rotation/what-this-strategy-actually-is-and-isn-t',
  },
  'us-home-base': {
    label: 'Build a Smarter U.S. Home Base',
    description: 'Keep Medicare, the dollar, and zero foreign tax filings — with the flight geography that matches how you actually want to travel.',
    locationFilter: 'us',
    guideHref: null,
  },
};

/**
 * Determine which of the five pathways best fits someone based on their
 * quiz answers. Same transparent, weighted-heuristic approach as
 * scoreDestination — every signal's contribution is visible and
 * explainable, not a black box.
 */
export function determinePathway(answers) {
  const scores = {
    'retire-abroad': 0,
    'work-remotely': 0,
    'slow-travel': 0,
    'tax-rotation': 0,
    'us-home-base': 0,
  };

  // Pace is the strongest single signal — it's the most direct
  // expression of what someone actually wants to do.
  if (answers.pace === 'rotate') scores['tax-rotation'] += 40;
  if (answers.pace === 'slow-travel') scores['slow-travel'] += 40;
  if (answers.pace === 'settle') {
    scores['retire-abroad'] += 15;
    scores['us-home-base'] += 15;
  }

  // Life stage
  if (answers.lifeStage === 'working') scores['work-remotely'] += 25;
  if (answers.lifeStage === 'retired') {
    scores['retire-abroad'] += 15;
    scores['us-home-base'] += 10;
  }
  if (answers.lifeStage === 'semi-retired') {
    scores['work-remotely'] += 10;
    scores['retire-abroad'] += 10;
  }

  // Income source
  if (answers.incomeSource === 'active-work') scores['work-remotely'] += 25;
  if (answers.incomeSource === 'ss-pension') {
    scores['retire-abroad'] += 10;
    scores['us-home-base'] += 10;
  }

  // Location preference
  if (answers.location === 'us') scores['us-home-base'] += 25;
  if (answers.location === 'abroad') {
    scores['retire-abroad'] += 20;
    scores['work-remotely'] += 10;
    scores['slow-travel'] += 10;
    scores['tax-rotation'] += 10;
  }

  // U.S. home base preference
  if (answers.homeBasePreference === 'want-one') scores['us-home-base'] += 20;
  if (answers.homeBasePreference === 'no-base') {
    scores['tax-rotation'] += 15;
    scores['slow-travel'] += 10;
  }

  // Tax priority nudges toward the two most tax-motivated pathways
  if (answers.taxPriority === 'critical') {
    scores['tax-rotation'] += 10;
    scores['us-home-base'] += 5;
  }

  const [topKey] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return topKey;
}

function totalBudget(d) {
  const b = d.budgetDefaults;
  if (!b) return null;
  const keys = ['rent', 'own', 'healthcare', 'transportation', 'groceries', 'utilities', 'phone', 'dining', 'misc'];
  const sum = keys.reduce((acc, k) => acc + (Number(b[k]) || 0), 0);
  return sum || null;
}

function hasFavorableTax(d) {
  if (d.type === 'state') return d.noIncomeTax === true;
  const t = `${d.taxSystem || ''} ${d.visaTaxTreatment || ''}`.toLowerCase();
  return t.includes('territorial') || t.includes('exempt');
}

function costScore(d) {
  const level = (d.costLevel || d.costOfLivingVsUS || '').toLowerCase();
  if (level.includes('budget') || level.includes('lower') || level.includes('30') || level.includes('40')) return 1;
  if (level.includes('moderate')) return 0.6;
  if (level.includes('above') || level.includes('premium')) return 0.2;
  return 0.5;
}

function healthcareScore(d) {
  if (d.type === 'state') {
    const m = (d.medicareAdvantageMarket || '').toLowerCase();
    if (m === 'excellent') return 1;
    if (m === 'good') return 0.7;
    if (m === 'limited') return 0.3;
    return 0.5;
  }
  const note = (d.healthcareCostNote || '').toLowerCase();
  if (note.includes('excellent') || note.includes('top') || note.includes('world-class')) return 1;
  return 0.6;
}

/**
 * Score a single destination against a set of quiz answers. Returns a
 * 0-100 score. Every sub-score is a simple, explainable heuristic — this
 * is intentionally transparent rather than a black box.
 */
export function scoreDestination(d, answers) {
  let score = 0;
  let maxScore = 0;

  // Location filter — hard exclude, not just a penalty
  if (answers.location === 'us' && d.type !== 'state') return -1;
  if (answers.location === 'abroad' && d.type !== 'country') return -1;

  // Budget match (weight: 30)
  maxScore += 30;
  const mid = BUDGET_MIDPOINTS[answers.budget];
  const tb = totalBudget(d);
  if (mid && tb) {
    const ratio = tb / mid;
    if (ratio <= 1.15) score += 30;
    else if (ratio <= 1.4) score += 18;
    else if (ratio <= 1.7) score += 8;
  } else {
    score += 15; // neutral if data missing
  }

  // Climate match (weight: 20)
  maxScore += 20;
  if (answers.climate && answers.climate !== 'no-preference') {
    const climate = CLIMATE[d.name];
    score += climate === answers.climate ? 20 : 4;
  } else {
    score += 12;
  }

  // Tax priority (weight: 20)
  maxScore += 20;
  if (answers.taxPriority === 'critical') {
    score += hasFavorableTax(d) ? 20 : 3;
  } else if (answers.taxPriority === 'matters') {
    score += 10 + costScore(d) * 10;
  } else {
    score += 12;
  }

  // Healthcare priority (weight: 20)
  maxScore += 20;
  if (answers.healthcarePriority === 'essential') {
    score += healthcareScore(d) * 20;
  } else if (answers.healthcarePriority === 'fine') {
    score += 12 + healthcareScore(d) * 6;
  } else {
    score += 12;
  }

  // Pace preference (weight: 10)
  maxScore += 10;
  if (answers.pace === 'rotate' && d.type === 'state' && ['Wyoming', 'South Dakota'].includes(d.name)) {
    score += 10; // domicile-friendly base for rotators
  } else if (answers.pace === 'rotate' && d.type === 'country') {
    score += 6; // most countries are neutral-to-fine for rotation; specifics live in the guide
  } else if (answers.pace === 'slow-travel' && d.type === 'country') {
    score += 8;
  } else {
    score += 5;
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Build a short written summary for a matched destination, using only
 * data already on the destination record — no LLM call.
 */
export function buildSummary(d, answers) {
  const parts = [];
  const climateLabel = CLIMATE_LABELS[CLIMATE[d.name]] || '';

  if (d.homepageTeaser) {
    parts.push(d.homepageTeaser);
  }

  if (climateLabel) {
    parts.push(`Climate: ${climateLabel}.`);
  }

  const tb = totalBudget(d);
  if (tb) {
    parts.push(`Estimated monthly budget excluding rent: roughly $${tb.toLocaleString()}.`);
  }

  if (d.type === 'country') {
    if (d.visaName) parts.push(`Visa: ${d.visaName}${d.visaDifficulty ? ` (${d.visaDifficulty} difficulty)` : ''}.`);
    if (hasFavorableTax(d)) parts.push('Uses a territorial or otherwise foreign-income-friendly tax system.');
  } else {
    if (d.noIncomeTax === true) parts.push('No state income tax.');
    if (d.medicareAdvantageMarket) parts.push(`Medicare Advantage market: ${d.medicareAdvantageMarket}.`);
  }

  return parts.join(' ');
}

/**
 * Score and rank all destinations, returning the top N with scores and
 * generated summaries attached.
 */
export function matchDestinations(destinations, answers, topN = 5) {
  const scored = destinations
    .map((d) => ({ ...d, matchScore: scoreDestination(d, answers) }))
    .filter((d) => d.matchScore >= 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, topN).map((d) => ({ ...d, summary: buildSummary(d, answers) }));
}

/**
 * Tax guide pointers based on quiz answers and the determined pathway —
 * links to the existing, already-built National/International Tax
 * Strategies and Tax-Residency Rotation guide pages relevant to this
 * person's situation.
 */
export function getTaxPointers(answers, topMatches, pathwayKey) {
  const pointers = [];
  const pathway = PATHWAYS[pathwayKey];

  if (pathway?.guideHref) {
    pointers.push({ label: `Start the ${pathway.label} guide`, href: pathway.guideHref });
  }

  if (answers.hasRetirementAccounts === 'yes') {
    const countryMatches = topMatches.filter((d) => d.type === 'country');
    if (countryMatches.length) {
      pointers.push({
        label: `See how ${countryMatches[0].name} treats Roth IRA and other retirement accounts`,
        href: `/guides/international-tax-strategies/${countryMatches[0].slug}-roth-ira-and-retirement-account-treatment`,
      });
    }
    if (answers.location !== 'abroad') {
      pointers.push({
        label: 'National Tax Strategies — Roth conversion timing, RMDs, IRMAA, and more',
        href: '/guides/national-tax-strategies/roth-conversion-ladders-in-early-retirement',
      });
    }
  }

  if (pathwayKey === 'tax-rotation') {
    pointers.push({
      label: 'Protecting Roth IRA and Retirement Accounts While Rotating',
      href: '/guides/tax-residency-rotation/protecting-roth-ira-and-retirement-accounts-while-rotating',
    });
    pointers.push({
      label: 'Browse Country Tax-Residency Thresholds',
      href: '/guides/tax-residency-rotation/thresholds',
    });
  }

  if (pathwayKey === 'slow-travel') {
    pointers.push({
      label: 'Browse the Slow Travel Destinations comparison table',
      href: '/guides/slow-travel/destinations',
    });
  }

  if (!pointers.length) {
    pointers.push({ label: 'Explore all Guides', href: '/guides' });
  }

  return pointers;
}
