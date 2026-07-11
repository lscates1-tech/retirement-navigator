'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { COUPLE_MULTIPLIER } from '@/lib/destinationDefaults';
import styles from './calculator.module.css';

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

export default function CalculatorClient({ countryDefaults, stateDefaults, dataSource }) {
  const ALL_DEFAULTS = useMemo(() => ({ ...countryDefaults, ...stateDefaults }), [countryDefaults, stateDefaults]);
  const COUNTRY_NAMES = useMemo(() => Object.keys(countryDefaults), [countryDefaults]);
  const STATE_NAMES = useMemo(() => Object.keys(stateDefaults), [stateDefaults]);

  const [household, setHousehold] = useState(1);
  const [income, setIncome] = useState({ ss: 2200, pension: 0, ira: 500, other: 0 });
  const [bufferPct, setBufferPct] = useState(15);

  // Panel A -- "Where you live now." Not one of the site's tracked
  // destinations, so this is always a free-text label with manually
  // entered expenses -- no Notion defaults to load.
  const [currentLabel, setCurrentLabel] = useState('Houston, TX');
  const [currentExpenses, setCurrentExpenses] = useState({ ...BLANK_EXPENSES });

  // Panel B -- "Where you're considering." Existing destination-based
  // behavior: pick a country or state, load its 2026-verified defaults,
  // then edit anything to match your actual situation.
  const [destination, setDestination] = useState(COUNTRY_NAMES[0] || STATE_NAMES[0]);
  const [own, setOwn] = useState(false);
  const [targetExpenses, setTargetExpenses] = useState(() =>
    applyHousehold(ALL_DEFAULTS[COUNTRY_NAMES[0] || STATE_NAMES[0]], 1, false)
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
    setTargetExpenses((prev) => ({ ...applyHousehold(ALL_DEFAULTS[destination], h, own), ...pickManual(prev) }));
  }
  function handleDestinationChange(name) {
    setDestination(name);
    setTargetExpenses((prev) => ({ ...applyHousehold(ALL_DEFAULTS[name], household, own), ...pickManual(prev) }));
  }
  function handleOwnChange(o) {
    setOwn(o);
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

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <h1 className={styles.title}>Budget Comparison Calculator</h1>
        <p className={styles.subtitle}>
          Enter your actual costs where you live now, compare against a destination&apos;s 2026-verified
          defaults, and see the real monthly difference.
          {' '}
          <span style={{ color: dataSource === 'notion' ? '#1B7A43' : '#A6760C' }}>
            ({dataSource === 'notion' ? 'live data from Notion' : 'static fallback data'})
          </span>
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

        <div className={styles.results}>
          <div className={styles.compareHeadline}>
            Moving from <strong>{currentLabel || 'your current home'}</strong> to <strong>{destination}</strong> would{' '}
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
              <div className={styles.resultLabel}>{destination}</div>
              <div className={styles.resultValue}>${targetTotalOut.toLocaleString()}<span className={styles.resultSuffix}>/mo total</span></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: targetRating.color }}>{targetRating.label}</div>
            </div>
          </div>

          <p className={styles.explainer}>
            <strong>{destination}:</strong> {targetRating.explain}
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
