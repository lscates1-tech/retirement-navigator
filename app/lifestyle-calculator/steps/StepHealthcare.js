'use client';

import styles from '../lifestyle-calculator.module.css';
import { calcIncome, estimateMagiForIrmaa, lookupIrmaaBracket } from '@/lib/lifestyleCalculator';
import { MEDICARE_2026 } from '@/lib/lifestyleMedicare2026';

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

function money(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * A national-baseline preview shown at Step 4, before any metro is chosen.
 * This is deliberately NOT the number that will appear in results — those
 * use metro-specific Medigap/Part D/MA figures. This preview exists so a
 * person isn't asked to pick a coverage strategy blind; it shows what
 * that strategy costs using national planning estimates, with the actual
 * IRMAA bracket applied using the income already entered in Step 2.
 */
function previewMedicareCost(coverageKey, magiAnnual, filingStatus) {
  const irmaa = lookupIrmaaBracket(magiAnnual, filingStatus);
  const fallback = MEDICARE_2026.nationalFallback;
  const partBLabel = irmaa.bracketIndex > 0 ? 'Part B (IRMAA-adjusted)' : 'Part B';

  if (coverageKey === 'medicare-medigap-partd') {
    const partD = fallback.standalonePartDMonthlyEstimate + irmaa.partDAdjustment;
    const lines = [
      { label: partBLabel, amount: irmaa.partBMonthly },
      { label: 'Medigap (Plan G, national estimate)', amount: fallback.medigapPlanGMonthlyEstimate },
      { label: irmaa.partDAdjustment ? 'Part D (incl. IRMAA)' : 'Part D (national estimate)', amount: partD },
    ];
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0), irmaa };
  }
  if (coverageKey === 'medicare-advantage') {
    const lines = [
      { label: partBLabel, amount: irmaa.partBMonthly },
      { label: 'Medicare Advantage plan (national estimate)', amount: fallback.medicareAdvantageMonthlyEstimate },
    ];
    if (irmaa.partDAdjustment) lines.push({ label: 'Part D IRMAA surcharge', amount: irmaa.partDAdjustment });
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0), irmaa };
  }
  // 'medicare' — Part B only
  return { lines: [{ label: partBLabel, amount: irmaa.partBMonthly }], total: irmaa.partBMonthly, irmaa };
}

export default function StepHealthcare({ formData, updatePersonField, hasBridgePeriod, bridgeYears }) {
  const { people } = formData;
  const income = calcIncome(people);
  const filingStatus = people.length >= 2 ? 'married' : 'single';

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
          const isMedicarePhase1 = ['medicare-medigap-partd', 'medicare-advantage', 'medicare'].includes(person.coveragePhase1);
          const isMedicarePhase2 = ['medicare-medigap-partd', 'medicare-advantage', 'medicare'].includes(person.coveragePhase2);
          const previewPhase1 = isMedicarePhase1 ? previewMedicareCost(person.coveragePhase1, estimateMagiForIrmaa(income.phase1), filingStatus) : null;
          const previewPhase2 = isMedicarePhase2 ? previewMedicareCost(person.coveragePhase2, estimateMagiForIrmaa(income.phase2), filingStatus) : null;

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

              {previewPhase1 && (
                <div className={styles.medicarePreview}>
                  {previewPhase1.lines.map((line) => (
                    <div key={line.label} className={styles.medicarePreviewLine}>
                      <span>{line.label}</span>
                      <span>{money(line.amount)}/mo</span>
                    </div>
                  ))}
                  <div className={styles.medicarePreviewTotal}>
                    <span>Estimated total{hasBridgePeriod ? ` (next ${bridgeYears}yr)` : ''}</span>
                    <span>{money(previewPhase1.total)}/mo</span>
                  </div>
                  <p className={styles.medicarePreviewNote}>
                    {previewPhase1.irmaa.bracketIndex > 0 && (
                      <span className={styles.irmaaFlag}>
                        Based on your income, this includes an IRMAA surcharge (Medicare's income-related premium adjustment).{' '}
                      </span>
                    )}
                    National planning estimate, not location-specific — Medigap and Part D costs vary by
                    metro and will be refined for each location in your results. IRMAA is normally based on
                    income from two years ago; this uses your entered income as a stand-in, since that's what
                    matters for planning a future move.
                  </p>
                </div>
              )}

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

              {previewPhase2 && (
                <div className={styles.medicarePreview}>
                  {previewPhase2.lines.map((line) => (
                    <div key={line.label} className={styles.medicarePreviewLine}>
                      <span>{line.label}</span>
                      <span>{money(line.amount)}/mo</span>
                    </div>
                  ))}
                  <div className={styles.medicarePreviewTotal}>
                    <span>Estimated total (later steady state)</span>
                    <span>{money(previewPhase2.total)}/mo</span>
                  </div>
                  <p className={styles.medicarePreviewNote}>
                    {previewPhase2.irmaa.bracketIndex > 0 && (
                      <span className={styles.irmaaFlag}>
                        Based on your income once both are on Medicare, this includes an IRMAA surcharge.{' '}
                      </span>
                    )}
                    National planning estimate — refined per location in your results.
                  </p>
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
