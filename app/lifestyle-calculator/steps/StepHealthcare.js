'use client';

import styles from '../lifestyle-calculator.module.css';

const COVERAGE_OPTIONS_UNDER_65 = [
  { value: 'aca', label: 'ACA Marketplace' },
  { value: 'private', label: 'Private / off-exchange plan' },
  { value: 'employer', label: 'Employer plan' },
  { value: 'actual', label: 'I know my actual monthly cost' },
];

const COVERAGE_OPTIONS_65_PLUS = [
  { value: 'medicare-medigap-partd', label: 'Medicare + Medigap + Part D' },
  { value: 'medicare-advantage', label: 'Medicare Advantage' },
  { value: 'medicare', label: 'Medicare Part B only' },
  { value: 'actual', label: 'I know my actual monthly cost' },
];

export default function StepHealthcare({ formData, updatePersonField, hasBridgePeriod, bridgeYears }) {
  const { people } = formData;

  return (
    <div>
      <div className={styles.stepLabel}>Step 4 of 6</div>
      <h2 className={styles.stepTitle}>Healthcare</h2>
      <p className={styles.stepIntro}>
        {hasBridgePeriod
          ? `Your household will go through a bridge period before everyone is Medicare-eligible. We'll estimate coverage for both stretches — the next ${bridgeYears} year${bridgeYears === 1 ? '' : 's'}, and once everyone is on Medicare.`
          : 'Tell us how each person gets covered so we can estimate the monthly cost.'}
      </p>

      <div className={styles.card}>
        {people.map((person, i) => {
          const willBeMedicareEligiblePhase1 = person.age >= 65;
          const optionsPhase1 = willBeMedicareEligiblePhase1 ? COVERAGE_OPTIONS_65_PLUS : COVERAGE_OPTIONS_UNDER_65;

          return (
            <div key={i} className={styles.personBlock}>
              <div className={styles.personBlockTitle}>{people.length > 1 ? (i === 0 ? 'You' : 'Spouse / Partner') : 'You'}</div>

              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`coverage-${i}-phase1`}>
                    {hasBridgePeriod ? `Coverage — now (next ${bridgeYears}yr)` : 'How will you get coverage?'}
                  </label>
                  <select
                    id={`coverage-${i}-phase1`}
                    className={styles.select}
                    value={person.coveragePhase1}
                    onChange={(e) => updatePersonField(i, 'coveragePhase1', e.target.value)}
                  >
                    {optionsPhase1.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {person.coveragePhase1 === 'actual' && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`premium-${i}-phase1`}>Actual monthly premium</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                      <input
                        id={`premium-${i}-phase1`}
                        type="number"
                        onFocus={(e) => e.target.select()}
                        className={styles.input}
                        value={person.actualPremiumOverridePhase1 || ''}
                        onChange={(e) => updatePersonField(i, 'actualPremiumOverridePhase1', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {hasBridgePeriod && (
                <div className={styles.fieldsGrid} style={{ marginTop: 14 }}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`coverage-${i}-phase2`}>Coverage — once both on Medicare</label>
                    <select
                      id={`coverage-${i}-phase2`}
                      className={styles.select}
                      value={person.coveragePhase2}
                      onChange={(e) => updatePersonField(i, 'coveragePhase2', e.target.value)}
                    >
                      {COVERAGE_OPTIONS_65_PLUS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {person.coveragePhase2 === 'actual' && (
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`premium-${i}-phase2`}>Actual monthly premium</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                        <input
                          id={`premium-${i}-phase2`}
                          type="number"
                          onFocus={(e) => e.target.select()}
                          className={styles.input}
                          value={person.actualPremiumOverridePhase2 || ''}
                          onChange={(e) => updatePersonField(i, 'actualPremiumOverridePhase2', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <p className={styles.helperNote}>
          ACA figures shown later are unsubsidized planning estimates — this version doesn't calculate premium
          tax credits, so your real cost may be lower depending on income.
        </p>
      </div>
    </div>
  );
}
