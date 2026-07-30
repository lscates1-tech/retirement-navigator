'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { COUPLE_MULTIPLIER } from '@/lib/destinationDefaults';
import {
  calculateRegionalTax,
  SPAIN_TAX_REGIONS,
  US_TAX_REGIONS,
  ITALY_TAX_REGIONS,
  GREECE_TAX_REGIONS,
} from '@/lib/regionalTaxCalculator';
import styles from './calculator.module.css';

// Destination -> tax engine wiring. Spain, the US, Italy, and Greece are
// supported by the regional tax engine today; everything else simply hides
// the Tax Impact section. For the six US states we have real per-state
// figures for, map name -> engine key so the zone dropdown can auto-select a
// sensible default and use the precise state rate instead of the zone's
// generic representative state.
const US_STATE_TO_ZONE = {
  Texas: 'no_state_tax',
  Florida: 'no_state_tax',
  'North Carolina': 'moderate_tax',
  Colorado: 'moderate_tax',
  California: 'high_tax',
  'New York': 'high_tax',
};
const US_STATE_TO_KEY = {
  Texas: 'TX',
  Florida: 'FL',
  'North Carolina': 'NC',
  Colorado: 'CO',
  California: 'CA',
  'New York': 'NY',
};

// Per-country metadata driving the generic Tax Impact UI below: which region
// options to list, what to call the picker, what currency to show, and the
// row labels for the results card. Adding a new country to the engine means
// adding one entry here (plus a branch in taxCountryFor and the taxResult
// useMemo) rather than threading new ternaries through the JSX.
const TAX_COUNTRY_META = {
  Spain: {
    regions: SPAIN_TAX_REGIONS,
    zoneLabel: 'Tax zone',
    currency: 'EUR',
    rowLabels: { national: 'National (ISGF + IRPF est.)', regional: 'Regional wealth tax' },
  },
  'United States': {
    regions: US_TAX_REGIONS,
    zoneLabel: 'Tax zone',
    currency: 'USD',
    rowLabels: { national: 'Federal (est.)', regional: 'State income tax' },
  },
  Italy: {
    regions: ITALY_TAX_REGIONS,
    zoneLabel: 'Tax Zone / Strategy',
    currency: 'EUR',
    rowLabels: { national: 'National (IRPEF / Flat Tax)', regional: 'Regional & municipal surtax' },
  },
  Greece: {
    regions: GREECE_TAX_REGIONS,
    zoneLabel: 'Tax Regime',
    currency: 'EUR',
    rowLabels: { national: 'National (Income Tax / Flat Tax)', regional: 'Regional tax' },
  },
};

function taxCountryFor(destination, stateNames) {
  if (TAX_COUNTRY_META[destination]) return destination;
  if (stateNames.includes(destination)) return 'United States';
  return null;
}

const CATEGORY_FIELDS = [
  { key: 'housing', label: 'Housing (rent/mortgage)' },
  { key: 'propertyTax', label: 'Property tax' },
  { key: 'insurance', label: 'Insurance (home + auto)' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'phone', label: 'Phone / Internet' },
  { key: 'dining', label: 'Dining' },
  { key: 'misc', label: 'Misc' },
];

// Property tax and insurance are highly personal (varies enormously by
// specific home, driving record, coverage level) -- there's no reasonable
// site-wide default for these, so they always start at 0 for manual entry
// on both panels, rather than being pulled from Notion.
const MANUAL_ONLY_KEYS = ['propertyTax', 'insurance'];

function applyHousehold(defaults, household, own) {
  const base = {
    housing: own ? defaults.own : defaults.rent,
    propertyTax: 0,
    insurance: 0,
    healthcare: defaults.healthcare,
    transportation: defaults.transportation,
    groceries: defaults.groceries,
    utilities: defaults.utilities,
    phone: defaults.phone,
    dining: defaults.dining,
    misc: defaults.misc,
  };
  if (household === 1) return base;

  const scaled = {};
  for (const key of Object.keys(base)) {
    if (MANUAL_ONLY_KEYS.includes(key)) {
      scaled[key] = base[key];
      continue;
    }
    const multKey = key === 'housing' ? 'rent' : key;
    const mult = COUPLE_MULTIPLIER[multKey] || 1;
    scaled[key] = Math.round(base[key] * mult);
  }
  return scaled;
}

const BLANK_EXPENSES = CATEGORY_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {});

function ratingFor(ratio) {
  if (ratio <= 0.7) return { label: 'Comfortable', color: '#1B7A43', explain: 'Income comfortably covers expenses and the buffer with meaningful room left over.' };
  if (ratio <= 0.9) return { label: 'Manageable', color: '#A6760C', explain: 'Income covers expenses and the buffer, with a modest margin -- worth tracking but not concerning.' };
  if (ratio <= 1.05) return { label: 'Tight', color: '#C2540F', explain: 'Expenses plus buffer are close to or slightly above income. Small cost increases could create a shortfall.' };
  return { label: 'High-Risk', color: '#A23E2E', explain: "Expenses plus buffer exceed income. This budget likely isn't sustainable as planned without higher income, lower costs, or a different destination." };
}

function ExpensePanel({ title, subtitle, children, expenses, num, maxAcrossBoth, accentColor }) {
  const totalExpenses = CATEGORY_FIELDS.reduce((sum, f) => sum + num(expenses[f.key]), 0);
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>{title}</div>
        {subtitle}
      </div>
      {children}
      <div className={styles.panelTotal}>
        <span>Monthly expenses (before buffer)</span>
        <strong style={{ color: accentColor }}>${totalExpenses.toLocaleString()}</strong>
      </div>
      <div className={styles.breakdownLabel}>Breakdown</div>
      {CATEGORY_FIELDS.map((f) => (
        <div className={styles.breakdownRow} key={f.key}>
          <div className={styles.catName}>{f.label}</div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${(num(expenses[f.key]) / maxAcrossBoth) * 100}%`, background: accentColor }}
            />
          </div>
          <div className={styles.catValue}>${num(expenses[f.key]).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

export default function CalculatorClient({ countryDefaults, stateDefaults, dataSource, initialDestination }) {
  const ALL_DEFAULTS = useMemo(() => ({ ...countryDefaults, ...stateDefaults }), [countryDefaults, stateDefaults]);
  const COUNTRY_NAMES = useMemo(() => Object.keys(countryDefaults), [countryDefaults]);
  const STATE_NAMES = useMemo(() => Object.keys(stateDefaults), [stateDefaults]);

  // A destination passed in via ?destination= (e.g. from a TaxStrategyCard CTA)
  // pre-selects that destination. Otherwise the panel starts with no
  // destination chosen at all -- an empty dropdown and blank expenses --
  // rather than silently defaulting to the first country alphabetically.
  const startingDestination =
    initialDestination && ALL_DEFAULTS[initialDestination] ? initialDestination : '';

  const [household, setHousehold] = useState(1);
  const [income, setIncome] = useState({ ss: 0, pension: 0, ira: 0, other: 0 });
  const [bufferPct, setBufferPct] = useState(15);

  // Panel A -- "Where you live now." Not one of the site's tracked
  // destinations, so this is always a free-text label with manually
  // entered expenses -- no Notion defaults to load.
  const [currentLabel, setCurrentLabel] = useState('');
  const [currentExpenses, setCurrentExpenses] = useState({ ...BLANK_EXPENSES });

  // Panel B -- "Where you're considering." Existing destination-based
  // behavior: pick a country or state, load its 2026-verified defaults,
  // then edit anything to match your actual situation.
  const [destination, setDestination] = useState(startingDestination);
  const [own, setOwn] = useState(false);
  const [targetExpenses, setTargetExpenses] = useState(() =>
    startingDestination ? applyHousehold(ALL_DEFAULTS[startingDestination], 1, false) : { ...BLANK_EXPENSES }
  );

  function pickManual(prev) {
    // Preserve any property tax / insurance the person already typed in
    // when switching destination/household/own, since those never come
    // from defaults in the first place.
    const out = {};
    for (const k of MANUAL_ONLY_KEYS) out[k] = prev[k];
    return out;
  }
  function handleHouseholdChange(h) {
    setHousehold(h);
    if (!destination) return;
    setTargetExpenses((prev) => ({ ...applyHousehold(ALL_DEFAULTS[destination], h, own), ...pickManual(prev) }));
  }
  // Tax Impact -- income, net worth, and regional tax zone for the destination
  // being considered. Only wired up for Spain and US states; other destinations
  // simply hide this section (see taxCountryFor).
  const [annualIncome, setAnnualIncome] = useState('');
  const [netWorth, setNetWorth] = useState('');
  function defaultZoneFor(name) {
    if (name === 'Spain') return 'standard';
    if (name === 'Italy') return 'standard';
    if (name === 'Greece') return 'standard';
    return US_STATE_TO_ZONE[name] || 'moderate_tax';
  }

  const [taxRegion, setTaxRegion] = useState(defaultZoneFor(startingDestination));
  const [spainSubRegion, setSpainSubRegion] = useState('catalonia'); // Catalonia vs Valencia, only shown for Spain's High-Tax Zone

  const taxCountry = useMemo(() => taxCountryFor(destination, STATE_NAMES), [destination, STATE_NAMES]);

  function handleDestinationChange(name) {
    setDestination(name);
    if (!name) {
      setTargetExpenses({ ...BLANK_EXPENSES });
      return;
    }
    setTargetExpenses((prev) => ({ ...applyHousehold(ALL_DEFAULTS[name], household, own), ...pickManual(prev) }));
    setTaxRegion(defaultZoneFor(name));
  }
  function handleOwnChange(o) {
    setOwn(o);
    if (!destination) return;
    setTargetExpenses((prev) => ({ ...applyHousehold(ALL_DEFAULTS[destination], household, o), ...pickManual(prev) }));
  }
  function updateCurrentExpense(key, value) {
    setCurrentExpenses((prev) => ({ ...prev, [key]: value }));
  }
  function updateTargetExpense(key, value) {
    setTargetExpenses((prev) => ({ ...prev, [key]: value }));
  }
  function updateIncome(key, value) {
    setIncome((prev) => ({ ...prev, [key]: value }));
  }

  const num = (v) => (v === '' || v === undefined || v === null ? 0 : Number(v) || 0);

  const totalIncome = num(income.ss) + num(income.pension) + num(income.ira) + num(income.other);

  const currentTotalExpenses = CATEGORY_FIELDS.reduce((sum, f) => sum + num(currentExpenses[f.key]), 0);
  const currentBuffer = Math.round(currentTotalExpenses * (bufferPct / 100));
  const currentTotalOut = currentTotalExpenses + currentBuffer;
  const currentRatio = totalIncome > 0 ? currentTotalOut / totalIncome : 999;
  const currentRating = ratingFor(currentRatio);

  const targetTotalExpenses = CATEGORY_FIELDS.reduce((sum, f) => sum + num(targetExpenses[f.key]), 0);
  const targetBuffer = Math.round(targetTotalExpenses * (bufferPct / 100));
  const targetTotalOut = targetTotalExpenses + targetBuffer;
  const targetRatio = totalIncome > 0 ? targetTotalOut / totalIncome : 999;
  const targetRating = ratingFor(targetRatio);

  const maxAcrossBoth = Math.max(
    ...CATEGORY_FIELDS.map((f) => num(currentExpenses[f.key])),
    ...CATEGORY_FIELDS.map((f) => num(targetExpenses[f.key])),
    1
  );

  const monthlyDiff = currentTotalOut - targetTotalOut;

  const taxResult = useMemo(() => {
    if (!taxCountry) return null;
    const income = num(annualIncome);
    const wealth = num(netWorth);
    if (income <= 0 && wealth <= 0) return null;

    if (taxCountry === 'Spain') {
      return calculateRegionalTax({
        country: 'Spain',
        taxRegion,
        regionOverride: spainSubRegion,
        netWealth: wealth,
        // Deliberate product decision (not a gap): no dedicated "primary residence
        // value" field, to keep the calculator light and fast. Total Net Worth /
        // Assets is treated as liquid/investable assets only -- what most retirees
        // actually care about when running these projections -- so the EUR 300k/600k
        // residence allowance is intentionally not modeled here. Surfaced to the user
        // via the micro-disclaimer under the Wealth Tax output below.
        primaryResidenceValue: 0,
        annualIncome: income,
        filers: household,
      });
    }

    if (taxCountry === 'Italy' || taxCountry === 'Greece') {
      return calculateRegionalTax({
        country: taxCountry,
        taxRegion,
        taxableIncome: income,
      });
    }

    return calculateRegionalTax({
      country: 'United States',
      taxRegion,
      taxableIncome: income,
      stateOverride: US_STATE_TO_KEY[destination],
      filingStatus: household === 2 ? 'mfj' : 'single',
    });
  }, [taxCountry, taxRegion, spainSubRegion, annualIncome, netWorth, household, own, destination]);

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <h1 className={styles.title}>Budget Comparison Calculator</h1>
        <p className={styles.subtitle}>
          Enter your actual costs where you live now, compare against a destination&apos;s 2026-verified
          defaults, and see the real monthly difference.
        </p>

        <div className={styles.block}>
          <div className={styles.blockTitle} style={{ marginBottom: 12 }}>Monthly Income (same for both)</div>
          <div className={styles.fieldsGrid}>
            <div>
              <label className={styles.label}>Social Security</label>
              <input className={styles.input} type="number" value={income.ss} onChange={(e) => updateIncome('ss', e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Pension</label>
              <input className={styles.input} type="number" value={income.pension} onChange={(e) => updateIncome('pension', e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>IRA / 401(k) withdrawal</label>
              <input className={styles.input} type="number" value={income.ira} onChange={(e) => updateIncome('ira', e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Other income</label>
              <input className={styles.input} type="number" value={income.other} onChange={(e) => updateIncome('other', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.block}>
          <label className={styles.label}>Household</label>
          <select
            className={styles.select}
            value={household}
            onChange={(e) => handleHouseholdChange(Number(e.target.value))}
          >
            <option value={1}>Single</option>
            <option value={2}>Couple</option>
          </select>
        </div>

        <div className={styles.panelsGrid}>
          <ExpensePanel
            title="Where you live now"
            subtitle={
              <input
                className={styles.panelLabelInput}
                value={currentLabel}
                onChange={(e) => setCurrentLabel(e.target.value)}
                placeholder="e.g. Houston, TX"
              />
            }
            expenses={currentExpenses}
            num={num}
            maxAcrossBoth={maxAcrossBoth}
            accentColor="#5C5A54"
          >
            <div className={styles.fieldsGrid}>
              {CATEGORY_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className={styles.label}>{f.label}</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={currentExpenses[f.key] ?? ''}
                    onChange={(e) => updateCurrentExpense(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ExpensePanel>

          <ExpensePanel
            title="Where you're considering"
            subtitle={
              <div className={styles.targetControls}>
                <select
                  className={styles.select}
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                >
                  <option value="">Select a destination</option>
                  <optgroup label="Countries">
                    {COUNTRY_NAMES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </optgroup>
                  <optgroup label="US States">
                    {STATE_NAMES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </optgroup>
                </select>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={own} onChange={(e) => handleOwnChange(e.target.checked)} />
                  I&apos;d own (not rent)
                </label>
              </div>
            }
            expenses={targetExpenses}
            num={num}
            maxAcrossBoth={maxAcrossBoth}
            accentColor="var(--ink)"
          >
            <div className={styles.fieldsGrid}>
              {CATEGORY_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className={styles.label}>{f.label}</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={targetExpenses[f.key] ?? ''}
                    onChange={(e) => updateTargetExpense(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ExpensePanel>
        </div>

        <div className={styles.block}>
          <label className={styles.bufferLabel}>Emergency buffer: {bufferPct}% of expenses (applied to both)</label>
          <input
            type="range"
            min={0}
            max={40}
            value={bufferPct}
            onChange={(e) => setBufferPct(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {taxCountry && (
          <div className={styles.block}>
            <div className={styles.blockTitle} style={{ marginBottom: 12 }}>
              Tax Impact for {destination}
            </div>
            <div className={styles.taxFieldsGrid}>
              <div>
                <label className={styles.label}>Annual income ({TAX_COUNTRY_META[taxCountry].currency})</label>
                <input
                  className={styles.input}
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={styles.label}>Total net worth / assets ({TAX_COUNTRY_META[taxCountry].currency})</label>
                <input
                  className={styles.input}
                  type="number"
                  value={netWorth}
                  onChange={(e) => setNetWorth(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={styles.label}>{TAX_COUNTRY_META[taxCountry].zoneLabel}</label>
                <select className={styles.select} value={taxRegion} onChange={(e) => setTaxRegion(e.target.value)}>
                  {Object.entries(TAX_COUNTRY_META[taxCountry].regions).map(([key, r]) => (
                    <option key={key} value={key}>{r.label}</option>
                  ))}
                </select>
              </div>
              {taxCountry === 'Spain' && taxRegion === 'high_tax' && (
                <div>
                  <label className={styles.label}>Region</label>
                  <select className={styles.select} value={spainSubRegion} onChange={(e) => setSpainSubRegion(e.target.value)}>
                    <option value="catalonia">Catalonia (EUR 500,000 allowance)</option>
                    <option value="valencia">Valencia (EUR 1,000,000 allowance)</option>
                  </select>
                </div>
              )}
            </div>
            <p className={styles.taxZoneHint}>
              {TAX_COUNTRY_META[taxCountry].regions[taxRegion]?.description}
            </p>

            {taxResult && (
              <>
                <div className={styles.taxResultCard}>
                  <div className={styles.taxResultRow}>
                    <span>{TAX_COUNTRY_META[taxCountry].rowLabels.national}</span>
                    <strong>{taxResult.currency === 'EUR' ? '\u20AC' : '$'}{taxResult.breakdownDetail.nationalTax.toLocaleString()}</strong>
                  </div>
                  <div className={styles.taxResultRow}>
                    <span>{TAX_COUNTRY_META[taxCountry].rowLabels.regional}</span>
                    <strong>{taxResult.currency === 'EUR' ? '\u20AC' : '$'}{taxResult.breakdownDetail.regionalTax.toLocaleString()}</strong>
                  </div>
                  <div className={styles.taxResultRow} style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10, marginTop: 4 }}>
                    <span>Total tax drag</span>
                    <strong>{taxResult.currency === 'EUR' ? '\u20AC' : '$'}{taxResult.totalTaxDrag.toLocaleString()}</strong>
                  </div>
                  {taxResult.breakdownDetail.totalSavingsComparedToHighestZone > 0 && (
                    <div className={styles.taxSavingsNote}>
                      Saving {taxResult.currency === 'EUR' ? '\u20AC' : '$'}
                      {taxResult.breakdownDetail.totalSavingsComparedToHighestZone.toLocaleString()}/year vs. the
                      standard zone at these same income/wealth figures.
                    </div>
                  )}
                  {taxResult.notes.map((n, i) => (
                    <p key={i} className={styles.disclaimer} style={{ marginTop: i === 0 ? 14 : 4 }}>{n}</p>
                  ))}
                </div>
                {taxCountry === 'Spain' && (
                  <p className={styles.taxMicroDisclaimer}>
                    *Tax estimates assume liquid investment assets and standard filing status. Spanish tax residents
                    can additionally deduct up to €300,000 for a primary residence.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className={styles.results}>
          <div className={styles.compareHeadline}>
            Moving from <strong>{currentLabel || 'your current home'}</strong> to{' '}
            <strong>{destination || 'a destination you choose'}</strong> would{' '}
            {monthlyDiff >= 0 ? (
              <span style={{ color: '#1B7A43' }}>free up <strong>${monthlyDiff.toLocaleString()}/month</strong></span>
            ) : (
              <span style={{ color: '#A23E2E' }}>cost <strong>${Math.abs(monthlyDiff).toLocaleString()}/month more</strong></span>
            )}
            .
          </div>

          <div className={styles.resultsSideBySide}>
            <div>
              <div className={styles.resultLabel}>{currentLabel || 'Current home'}</div>
              <div className={styles.resultValue}>${currentTotalOut.toLocaleString()}<span className={styles.resultSuffix}>/mo total</span></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: currentRating.color }}>{currentRating.label}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.resultLabel}>{destination || 'Select a destination'}</div>
              <div className={styles.resultValue}>${targetTotalOut.toLocaleString()}<span className={styles.resultSuffix}>/mo total</span></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: targetRating.color }}>{targetRating.label}</div>
            </div>
          </div>

          <p className={styles.explainer}>
            <strong>{destination || 'Your destination'}:</strong> {targetRating.explain}
          </p>
          <p className={styles.explainer}>
            <strong>{currentLabel || 'Current home'}:</strong> {currentRating.explain}
          </p>

          <p className={styles.disclaimer}>
            Destination defaults sourced from 2026 cost-of-living data (Numbeo, expat cost guides, HUD Fair
            Market Rent, BLS Consumer Expenditure Survey, C2ER/MERIC state indices). Property tax and
            insurance are always manually entered on both sides, since these vary too much by individual
            situation for a general default. Single-person baseline; couple figures apply category-specific
            multipliers to destination defaults only. Treat as a planning starting point, not a guarantee --
            verify current costs for your specific situation. Not tax or financial advice.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
