'use client';

import styles from '../lifestyle-calculator.module.css';

const STREAMS = [
  { key: 'socialSecurity', label: 'Social Security', showPhase2: true },
  { key: 'pension', label: 'Pension', showPhase2: true },
  { key: 'iraWithdrawal', label: 'IRA / 401(k) withdrawal', showPhase2: true },
  { key: 'employment', label: 'Employment / self-employment income', showPhase2: false },
  { key: 'other', label: 'Other recurring income', showPhase2: false },
];

function money(n) {
  return `$${(Number(n) || 0).toLocaleString()}`;
}

export default function StepIncome({ formData, updatePersonPhaseField, hasBridgePeriod, bridgeYears }) {
  const { people } = formData;

  const monthlyTotal = (phase) => people.reduce((sum, p) => (
    sum + STREAMS.reduce((s, stream) => s + (Number(p[stream.key]?.[phase]) || 0), 0)
  ), 0);

  return (
    <div>
      <div className={styles.stepLabel}>Step 2 of 6</div>
      <h2 className={styles.stepTitle}>Your income</h2>
      <p className={styles.stepIntro}>
        Monthly amounts, before taxes. IRA/401(k) withdrawals are tracked separately from the rest —
        they're taxable income that can affect ACA subsidy eligibility, so we don't treat them as
        automatically equivalent to other spendable income.
      </p>

      <div className={styles.card}>
        {people.map((person, i) => (
          <div key={i} className={styles.personBlock}>
            <div className={styles.personBlockTitle}>{people.length > 1 ? (i === 0 ? 'You' : 'Spouse / Partner') : 'You'}</div>

            {STREAMS.map((stream) => {
              const idBase = `income-${i}-${stream.key}`;
              return (
                <div key={stream.key} className={styles.fieldsGrid} style={{ marginBottom: 14 }}>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label className={styles.label} htmlFor={`${idBase}-phase1`}>
                      {stream.label}{hasBridgePeriod && stream.showPhase2 ? ` — now (next ${bridgeYears}yr)` : ''}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                      <input
                        id={`${idBase}-phase1`}
                        type="number"
                        onFocus={(e) => e.target.select()}
                        className={styles.input}
                        value={person[stream.key].phase1}
                        onChange={(e) => updatePersonPhaseField(i, stream.key, 'phase1', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  {hasBridgePeriod && stream.showPhase2 ? (
                    <div className={styles.field} style={{ marginBottom: 0 }}>
                      <label className={styles.label} htmlFor={`${idBase}-phase2`}>{stream.label} — once both on Medicare</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                        <input
                          id={`${idBase}-phase2`}
                          type="number"
                          onFocus={(e) => e.target.select()}
                          className={styles.input}
                          value={person[stream.key].phase2}
                          onChange={(e) => updatePersonPhaseField(i, stream.key, 'phase2', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        ))}

        <div className={styles.subheading}>Monthly household income</div>
        <div className={styles.fieldsGrid}>
          <div>
            <div className={styles.label}>{hasBridgePeriod ? `Now (next ${bridgeYears}yr)` : 'Current'}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>{money(monthlyTotal('phase1'))}</div>
          </div>
          {hasBridgePeriod && (
            <div>
              <div className={styles.label}>Once both on Medicare</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>{money(monthlyTotal('phase2'))}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
