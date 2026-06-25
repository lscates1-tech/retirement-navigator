'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { COUNTRY_DEFAULTS, STATE_DEFAULTS, COUPLE_MULTIPLIER } from '@/lib/destinationDefaults';
import styles from './calculator.module.css';

const ALL_DEFAULTS = { ...COUNTRY_DEFAULTS, ...STATE_DEFAULTS };
const COUNTRY_NAMES = Object.keys(COUNTRY_DEFAULTS);
const STATE_NAMES = Object.keys(STATE_DEFAULTS);

const CATEGORY_FIELDS = [
  { key: 'housing', label: 'Housing' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'phone', label: 'Phone / Internet' },
  { key: 'dining', label: 'Dining' },
  { key: 'misc', label: 'Misc' },
];

function applyHousehold(defaults, household, own) {
  const base = {
    housing: own ? defaults.own : defaults.rent,
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
    const multKey = key === 'housing' ? 'rent' : key;
    const mult = COUPLE_MULTIPLIER[multKey] || 1;
    scaled[key] = Math.round(base[key] * mult);
  }
  return scaled;
}

function ratingFor(ratio) {
  if (ratio <= 0.7) return { label: 'Comfortable', color: '#1B7A43', explain: 'Your income comfortably covers expenses and the buffer with meaningful room left over.' };
  if (ratio <= 0.9) return { label: 'Manageable', color: '#A6760C', explain: 'Your income covers expenses and the buffer, with a modest margin — worth tracking but not concerning.' };
  if (ratio <= 1.05) return { label: 'Tight', color: '#C2540F', explain: 'Expenses plus your buffer are close to or slightly above income. Small cost increases could create a shortfall.' };
  return { label: 'High-Risk', color: '#A23E2E', explain: "Expenses plus your buffer exceed your income. This budget likely isn't sustainable as planned without higher income, lower costs, or a different destination." };
}

export default function CalculatorPage() {
  const [destination, setDestination] = useState('Portugal');
  const [household, setHousehold] = useState(1);
  const [own, setOwn] = useState(false);

  const [income, setIncome] = useState({ ss: 2200, pension: 0, ira: 500, other: 0 });
  const [bufferPct, setBufferPct] = useState(15);

  const defaultExpenses = useMemo(
    () => applyHousehold(ALL_DEFAULTS[destination], household, own),
    [destination, household, own]
  );

  const [expenses, setExpenses] = useState(defaultExpenses);

  function handleDestinationChange(name) {
    setDestination(name);
    setExpenses(applyHousehold(ALL_DEFAULTS[name], household, own));
  }
  function handleHouseholdChange(h) {
    setHousehold(h);
    setExpenses(applyHousehold(ALL_DEFAULTS[destination], h, own));
  }
  function handleOwnChange(o) {
    setOwn(o);
    setExpenses(applyHousehold(ALL_DEFAULTS[destination], household, o));
  }
  function updateExpense(key, value) {
    setExpenses((prev) => ({ ...prev, [key]: value }));
  }
  function updateIncome(key, value) {
    setIncome((prev) => ({ ...prev, [key]: value }));
  }

  const num = (v) => (v === '' || v === undefined || v === null ? 0 : Number(v) || 0);

  const totalIncome = num(income.ss) + num(income.pension) + num(income.ira) + num(income.other);
  const totalExpenses = CATEGORY_FIELDS.reduce((sum, f) => sum + num(expenses[f.key]), 0);
  const buffer = Math.round(totalExpenses * (bufferPct / 100));
  const totalOut = totalExpenses + buffer;
  const diff = totalIncome - totalOut;
  const ratio = totalIncome > 0 ? totalOut / totalIncome : 999;
  const rating = ratingFor(ratio);
  const maxCat = Math.max(...CATEGORY_FIELDS.map((f) => num(expenses[f.key])), 1);

  return (
    <main>
      <Nav />
      <div className={styles.wrap}>
        <h1 className={styles.title}>Retirement Monthly Budget Calculator</h1>
        <p className={styles.subtitle}>
          Pick a destination to load 2026-verified cost defaults, then adjust anything to match your situation.
        </p>

        <div className={styles.row2}>
          <div>
            <label className={styles.label}>Destination</label>
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
          </div>
          <div>
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
        </div>

        <div className={styles.block}>
          <div className={styles.blockTitle} style={{ marginBottom: 12 }}>Monthly Income</div>
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
          <div className={styles.blockHead}>
            <div className={styles.blockTitle}>Monthly Expenses</div>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={own} onChange={(e) => handleOwnChange(e.target.checked)} />
              I own (not rent)
            </label>
          </div>
          <div className={styles.fieldsGrid}>
            {CATEGORY_FIELDS.map((f) => (
              <div key={f.key}>
                <label className={styles.label}>{f.label}</label>
                <input
                  className={styles.input}
                  type="number"
                  value={expenses[f.key] ?? ''}
                  onChange={(e) => updateExpense(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.block}>
          <label className={styles.bufferLabel}>Emergency buffer: {bufferPct}% of expenses</label>
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
          <div className={styles.resultsTop}>
            <div>
              <div className={styles.resultLabel}>Total Monthly Income</div>
              <div className={styles.resultValue}>${totalIncome.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.resultLabel}>Total Expenses + Buffer</div>
              <div className={styles.resultValue}>${totalOut.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.surplusBar}>
            <div>
              <div className={styles.resultLabel}>Monthly {diff >= 0 ? 'Surplus' : 'Shortfall'}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: diff >= 0 ? '#1B7A43' : '#A23E2E' }}>
                {diff >= 0 ? '+' : ''}${diff.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.resultLabel}>Affordability</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: rating.color }}>{rating.label}</div>
            </div>
          </div>

          <p className={styles.explainer}>
            {rating.explain} Suggested emergency buffer at {bufferPct}% of expenses:{' '}
            <strong>${buffer.toLocaleString()}/month</strong>.
          </p>

          <div className={styles.breakdownLabel}>Expense Breakdown</div>
          {CATEGORY_FIELDS.map((f) => (
            <div className={styles.breakdownRow} key={f.key}>
              <div className={styles.catName}>{f.label}</div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${(num(expenses[f.key]) / maxCat) * 100}%` }} />
              </div>
              <div className={styles.catValue}>${num(expenses[f.key]).toLocaleString()}</div>
            </div>
          ))}

          <p className={styles.disclaimer}>
            Defaults sourced from 2026 cost-of-living data (Numbeo, expat cost guides, HUD Fair
            Market Rent, BLS Consumer Expenditure Survey, C2ER/MERIC state indices). Single-person
            baseline; couple figures apply category-specific multipliers. Treat as a planning
            starting point, not a guarantee — verify current costs for your specific situation.
            Not tax or financial advice.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
