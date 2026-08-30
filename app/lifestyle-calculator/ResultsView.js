'use client';

import { useMemo, useState, useEffect, Fragment } from 'react';
import styles from './lifestyle-calculator.module.css';
import EstimateField from '@/components/EstimateField';
import { evaluateAllMetros, calcHomeEquity, buildTradeoffCopy } from '@/lib/lifestyleCalculator';

function money(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString()}`;
}

const CONFIDENCE_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const CONFIDENCE_CLASS = { high: 'confidenceHigh', medium: 'confidenceMedium', low: 'confidenceLow' };
const SOURCE_CATEGORY_LABEL = {
  housing: 'Home value', propertyTax: 'Property tax', insurance: 'Homeowners insurance',
  livingCosts: 'Living costs', healthcare: 'Healthcare', climate: 'Climate', travel: 'Airport/travel', risk: 'Risk',
};

export default function ResultsView({ metroDefaults, metroNames, formData, onEditAnswers }) {
  const { people, home, priorities, locationMode } = formData;
  const isCompareMode = locationMode === 'compare';

  const results = useMemo(
    () => evaluateAllMetros(metroDefaults, metroNames, people, home, priorities),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metroDefaults, metroNames, JSON.stringify(people), JSON.stringify(home), JSON.stringify(priorities)],
  );

  const hasBridgePeriod = results[0]?.hasBridgePeriod;
  const bridgeYears = results[0]?.bridgeYears;
  const [phase, setPhase] = useState('phase1');
  const [homeOverrides, setHomeOverrides] = useState({}); // { [metroName]: string }
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showAll, setShowAll] = useState(isCompareMode); // Compare sets are already small; Explore defaults to top 5
  const [pendingPrint, setPendingPrint] = useState(false);

  // "Print your results" always prints the full list, even if the page is
  // currently showing only the top 5 — otherwise a printed copy would
  // silently drop results the person hasn't clicked "See all" for yet.
  // The state update and window.print() are deliberately split across a
  // render: calling print() immediately after setShowAll(true) would
  // capture the DOM from before the additional rows/cards actually commit.
  useEffect(() => {
    if (pendingPrint) {
      window.print();
      setPendingPrint(false);
    }
  }, [pendingPrint, showAll]);

  const handlePrint = () => {
    if (!showAll) setShowAll(true);
    setPendingPrint(true);
  };

  const toggleRow = (metroName) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(metroName)) next.delete(metroName);
      else next.add(metroName);
      return next;
    });
  };

  const current = results.map((r) => ({ metroName: r.metroName, ...r[phase] }));

  // Raw per-phase lookup, independent of which phase drives the ranking —
  // used so the bridge-vs-later comparison on each card can show BOTH
  // phases simultaneously rather than only whichever one the toggle is
  // currently set to. A weak bridge period must never be hidden behind a
  // strong steady-state number.
  const bothPhasesFor = (metroName) => results.find((r) => r.metroName === metroName);
  const total = current.length;

  const equityFor = (metroName, defaultEquity) => {
    const override = homeOverrides[metroName];
    if (!override) return defaultEquity;
    const metro = metroDefaults[metroName];
    const adjustedMetro = { ...metro, housing: { ...metro.housing, typicalHomeValue: Number(override) } };
    return calcHomeEquity(home, adjustedMetro);
  };

  // Top cards always reflect the FULL comparison set (all 19 in Explore, or
  // every selected metro in Compare) — never just the top-5 slice, since
  // e.g. the best Financial Fit metro might not be in the top-5-by-Overall-Fit
  const bestOverall = [...current].sort((a, b) => b.overallFit - a.overallFit)[0];
  const bestFinancial = [...current].sort((a, b) => b.financialFit - a.financialFit)[0];
  const bestLifestyle = [...current].sort((a, b) => b.lifestyleFit - a.lifestyleFit)[0];
  const bestHealthTravel = [...current].sort((a, b) => {
    const scoreA = (a.lifestyleScores.healthcare + a.lifestyleScores.travel) / 2;
    const scoreB = (b.lifestyleScores.healthcare + b.lifestyleScores.travel) / 2;
    return scoreB - scoreA;
  })[0];

  const fullyRanked = [...current].sort((a, b) => b.overallFit - a.overallFit);
  const displayedResults = showAll ? fullyRanked : fullyRanked.slice(0, 5);
  const rankContext = { mode: isCompareMode ? 'compare' : 'explore' };

  // Near-tie detection: flag when a result is within 2 Overall Fit points
  // of the one ranked immediately above it — presentation only, scores
  // themselves are untouched
  const closeMatchAbove = (index) => {
    if (index <= 0) return null;
    const gap = fullyRanked[index - 1].overallFit - fullyRanked[index].overallFit;
    return gap <= 2 ? fullyRanked[index - 1].metroName : null;
  };

  return (
    <div>
      <div className={styles.resultsHeader}>
        <div className={styles.betaTag}>{total} location{total === 1 ? '' : 's'} in the Next Horizon database</div>
        <h2 className={styles.stepTitle} style={{ marginBottom: 6 }}>
          {isCompareMode ? 'Your comparison' : 'Your strongest matches'}
        </h2>
        <p className={styles.stepIntro} style={{ marginBottom: 8 }}>
          {isCompareMode
            ? "Here's how the places you selected compare."
            : 'Ranked across financial fit and the lifestyle factors you told us matter.'}
        </p>
        <button
          type="button"
          onClick={onEditAnswers}
          className={styles.noPrint}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brass-on-light)', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer', fontSize: 14 }}
        >
          Edit your answers
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className={styles.noPrint}
          style={{ background: 'none', border: '1px solid var(--border-soft)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14, marginLeft: 16 }}
        >
          Print your results
        </button>
      </div>

      <div className={styles.printHeader}>
        <div className={styles.printLogo}>Next Horizon — Lifestyle Calculator</div>
        <div className={styles.printDate}>Printed {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className={styles.definitionsBlock}>
        <p className={styles.definitionItem}>
          <strong>Financial Fit</strong> shows how comfortably your expected income covers the estimated
          core costs of living in this location. It's not investment advice, and a high score doesn't mean
          you should move there — it just means the budget works. This score is absolute: it means the same
          thing whether you're looking at {total} locations or just one.
        </p>
        <p className={styles.definitionItem} style={{ marginBottom: 6 }}>
          <strong>Lifestyle Fit</strong> shows how well a location matches the priorities and preferences
          <em> you</em> told us matter to you — it's personalized to your answers, not a claim that one
          place objectively has a better lifestyle than another.
          <span className={styles.definitionFactors}>Based on healthcare access, climate, international travel, amenities, and disaster/insurance risk.</span>
        </p>
        <details className={styles.calcDetails}>
          <summary>How Financial Fit is calculated</summary>
          <div className={styles.calcDetailsBody}>
            <ol>
              <li>Start with your expected monthly income</li>
              <li>Subtract estimated core monthly expenses (housing, living costs, healthcare) for this location</li>
              <li>What's left is your monthly surplus</li>
              <li>We express that surplus as a percentage of your income</li>
              <li>That percentage maps to a fixed 0–100 score — the same surplus percentage always produces the same score, no matter which other locations you're comparing against</li>
            </ol>
          </div>
        </details>
      </div>

      {hasBridgePeriod && (
        <>
          <p className={styles.bridgeExplainer}>
            <strong>Your first {bridgeYears} year{bridgeYears === 1 ? '' : 's'} may look different:</strong> one
            of you is Medicare-eligible while the other still needs pre-Medicare coverage. Later, both
            healthcare costs and household income may change — the tabs below show each stretch separately.
          </p>
          <div className={styles.phaseToggleRow} role="tablist" aria-label="Household phase">
            <button
              type="button"
              role="tab"
              aria-selected={phase === 'phase1'}
              className={`${styles.phaseToggleBtn} ${phase === 'phase1' ? styles.phaseToggleBtnActive : ''}`}
              onClick={() => setPhase('phase1')}
            >
              First {bridgeYears} year{bridgeYears === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={phase === 'phase2'}
              className={`${styles.phaseToggleBtn} ${phase === 'phase2' ? styles.phaseToggleBtnActive : ''}`}
              onClick={() => setPhase('phase2')}
            >
              Later steady state
            </button>
          </div>
        </>
      )}

      <div className={styles.topCardsGrid}>
        <div className={styles.topCard}>
          <div className={styles.topCardEyebrow}>Best Overall Fit</div>
          <div className={styles.topCardMetro}>{bestOverall.metroName}</div>
          <div className={styles.topCardScore}>{bestOverall.overallFit}/100</div>
        </div>
        <div className={styles.topCard}>
          <div className={styles.topCardEyebrow}>Best Financial Fit</div>
          <div className={styles.topCardMetro}>{bestFinancial.metroName}</div>
          <div className={styles.topCardScore}>{bestFinancial.financialFit}/100</div>
        </div>
        <div className={styles.topCard}>
          <div className={styles.topCardEyebrow}>Best Lifestyle Fit</div>
          <div className={styles.topCardMetro}>{bestLifestyle.metroName}</div>
          <div className={styles.topCardScore}>{bestLifestyle.lifestyleFit}/100</div>
        </div>
        <div className={styles.topCard}>
          <div className={styles.topCardEyebrow}>Best Healthcare &amp; Travel Fit</div>
          <div className={styles.topCardMetro}>{bestHealthTravel.metroName}</div>
          <div className={styles.topCardScore}>
            {Math.round((bestHealthTravel.lifestyleScores.healthcare + bestHealthTravel.lifestyleScores.travel) / 2)}/100
          </div>
        </div>
      </div>

      {!isCompareMode && (
        <p className={styles.modeContextLine}>
          Compared with {total} locations currently available in Next Horizon.
          {!showAll && ` Showing your top 5 — ${total - 5} more below.`}
        </p>
      )}

      <div className={styles.compareTableWrap}>
        <table className={styles.compareTable}>
          <caption className={styles.srOnly}>
            Comparison of {displayedResults.length} of {total} locations by estimated monthly cost, surplus,
            Financial Fit, and Overall Fit. Select "View details" on any row for Lifestyle Fit, typical home
            value, home equity impact, and healthcare estimate.
          </caption>
          <thead>
            <tr>
              <th scope="col"><span className={styles.srOnly}>Expand</span></th>
              <th scope="col">Location</th>
              <th scope="col">Monthly cost</th>
              <th scope="col">Monthly surplus</th>
              <th scope="col">Financial Fit</th>
              <th scope="col">Overall Fit</th>
            </tr>
          </thead>
          <tbody>
            {displayedResults.map((r) => {
              const equity = equityFor(r.metroName, r.homeEquity);
              const expanded = expandedRows.has(r.metroName);
              const detailsId = `details-${r.metroName.replace(/[^a-zA-Z0-9]+/g, '-')}`;
              const rankIndex = fullyRanked.findIndex((x) => x.metroName === r.metroName);
              const closeMatch = closeMatchAbove(rankIndex);
              return (
                <Fragment key={r.metroName}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className={`${styles.expandBtn} ${styles.noPrint}`}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        onClick={() => toggleRow(r.metroName)}
                      >
                        {expanded ? '\u2212' : '+'}
                        <span className={styles.srOnly}>View details for {r.metroName}</span>
                      </button>
                    </td>
                    <td className={styles.metroNameCell}>
                      {r.metroName}
                      {closeMatch && <span className={styles.closeMatchBadge}>Very close match</span>}
                    </td>
                    <td className={styles.numCell}>{money(r.monthlyExpenses)}</td>
                    <td className={`${styles.numCell} ${r.monthlySurplus >= 0 ? styles.positive : styles.negative}`}>{money(r.monthlySurplus)}</td>
                    <td className={styles.numCell}>{r.financialFit}</td>
                    <td className={styles.numCell}><strong>{r.overallFit}</strong></td>
                  </tr>
                  {expanded && (
                    <tr id={detailsId}>
                      <td colSpan={6} className={styles.detailsPanel}>
                        <div className={styles.detailsPanelGrid}>
                          <div className={styles.detailsPanelItem}>
                            <span className={styles.detailsPanelLabel}>Lifestyle Fit</span>
                            <span className={styles.detailsPanelValue}>{r.lifestyleFit}/100</span>
                          </div>
                          <div className={styles.detailsPanelItem}>
                            <span className={styles.detailsPanelLabel}>Typical home value</span>
                            <span className={styles.detailsPanelValue}>{money(metroDefaults[r.metroName].housing.typicalHomeValue)}</span>
                          </div>
                          <div className={styles.detailsPanelItem}>
                            <span className={styles.detailsPanelLabel}>Equity released / cash needed</span>
                            <span className={`${styles.detailsPanelValue} ${equity?.equityReleased > 0 ? styles.positive : equity?.additionalCashNeeded > 0 ? styles.negative : ''}`}>
                              {equity?.equityReleased > 0 ? `+${money(equity.equityReleased)}` : equity?.additionalCashNeeded > 0 ? `-${money(equity.additionalCashNeeded)}` : '—'}
                            </span>
                          </div>
                          <div className={styles.detailsPanelItem}>
                            <span className={styles.detailsPanelLabel}>Healthcare estimate</span>
                            <span className={styles.detailsPanelValue}>{money(r.healthcare.totalMonthly)}/mo</span>
                          </div>
                          {hasBridgePeriod && (
                            <div className={styles.detailsPanelItem}>
                              <span className={styles.detailsPanelLabel}>Current phase</span>
                              <span className={styles.detailsPanelValue}>{phase === 'phase1' ? `First ${bridgeYears}yr` : 'Steady state'}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isCompareMode && !showAll && total > 5 && (
        <button type="button" className={`${styles.seeAllBtn} ${styles.noPrint}`} onClick={() => setShowAll(true)}>
          See all {total} results
        </button>
      )}

      {displayedResults.map((r) => {
        const copy = buildTradeoffCopy(r, current, rankContext);
        const metro = metroDefaults[r.metroName];
        const equity = equityFor(r.metroName, r.homeEquity);
        const rankIndex = fullyRanked.findIndex((x) => x.metroName === r.metroName);
        const closeMatch = closeMatchAbove(rankIndex);
        return (
          <div key={r.metroName} className={styles.tradeoffCard}>
            <div className={styles.tradeoffHead}>
              <div className={styles.tradeoffMetro}>
                {r.metroName}
                {closeMatch && <span className={styles.closeMatchBadge}>Very close match with {closeMatch}</span>}
              </div>
              <div className={styles.tradeoffOverall}>{copy.rankLabel}</div>
            </div>

            <div className={styles.matchStatsRow}>
              <div className={styles.matchStatItem}>
                <span className={styles.matchStatLabel}>Overall Fit</span>
                <span className={styles.matchStatValue}>{r.overallFit}/100</span>
              </div>
              <div className={styles.matchStatItem}>
                <span className={styles.matchStatLabel}>Financial Fit</span>
                <span className={styles.matchStatValue}>{r.financialFit}/100</span>
              </div>
              <div className={styles.matchStatItem}>
                <span className={styles.matchStatLabel}>Lifestyle Fit</span>
                <span className={styles.matchStatValue}>{r.lifestyleFit}/100</span>
              </div>
              <div className={styles.matchStatItem}>
                <span className={styles.matchStatLabel}>Monthly surplus</span>
                <span className={`${styles.matchStatValue} ${r.monthlySurplus >= 0 ? styles.positive : styles.negative}`}>{money(r.monthlySurplus)}</span>
                {hasBridgePeriod && (
                  <span className={styles.phaseBadge}>{phase === 'phase1' ? `First ${bridgeYears}yr` : 'Steady state'}</span>
                )}
              </div>
            </div>

            {hasBridgePeriod && (() => {
              const both = bothPhasesFor(r.metroName);
              const gap = both.phase2.financialFit - both.phase1.financialFit;
              return (
                <>
                  <div className={styles.bridgeCompareRow}>
                    <div className={styles.bridgeCompareCol}>
                      <div className={styles.bridgeCompareColLabel}>First {bridgeYears} year{bridgeYears === 1 ? '' : 's'}</div>
                      <div className={styles.bridgeCompareStats}>
                        <div className={styles.bridgeCompareStat}>
                          <span className={styles.bridgeCompareStatLabel}>Surplus</span>
                          <span className={`${styles.bridgeCompareStatValue} ${both.phase1.monthlySurplus >= 0 ? styles.positive : styles.negative}`}>{money(both.phase1.monthlySurplus)}</span>
                        </div>
                        <div className={styles.bridgeCompareStat}>
                          <span className={styles.bridgeCompareStatLabel}>Financial Fit</span>
                          <span className={styles.bridgeCompareStatValue}>{both.phase1.financialFit}/100</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.bridgeCompareCol}>
                      <div className={styles.bridgeCompareColLabel}>Later steady state</div>
                      <div className={styles.bridgeCompareStats}>
                        <div className={styles.bridgeCompareStat}>
                          <span className={styles.bridgeCompareStatLabel}>Surplus</span>
                          <span className={`${styles.bridgeCompareStatValue} ${both.phase2.monthlySurplus >= 0 ? styles.positive : styles.negative}`}>{money(both.phase2.monthlySurplus)}</span>
                        </div>
                        <div className={styles.bridgeCompareStat}>
                          <span className={styles.bridgeCompareStatLabel}>Financial Fit</span>
                          <span className={styles.bridgeCompareStatValue}>{both.phase2.financialFit}/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {gap >= 15 && (
                    <p className={styles.bridgeWeakFlag}>
                      This location is noticeably tighter during your first {bridgeYears} year{bridgeYears === 1 ? '' : 's'} (Financial Fit {both.phase1.financialFit}) than it is later (Financial Fit {both.phase2.financialFit}) — worth planning around the bridge period specifically, not just the steady state.
                    </p>
                  )}
                </>
              );
            })()}

            <p className={styles.tradeoffWhy}><strong>Why this ranked here:</strong> {copy.whyRankedHere}</p>
            <p className={styles.tradeoffTrade}><strong>The tradeoff:</strong> {copy.theTradeoff}</p>

            <details className={styles.dataDisclosure}>
              <summary>Healthcare cost breakdown ({money(r.healthcare.totalMonthly)}/mo total)</summary>
              <div className={styles.dataDisclosureBody}>
                {r.healthcare.perPerson.map((p) => (
                  <div key={p.name} style={{ marginBottom: 10 }}>
                    <strong style={{ color: 'var(--charcoal)' }}>{p.name}</strong>
                    {p.breakdown.map((line) => (
                      <div key={line.label} className={styles.medicarePreviewLine}>
                        <span>{line.label}</span>
                        <span>{money(line.amount)}/mo</span>
                      </div>
                    ))}
                  </div>
                ))}
                {r.healthcare.irmaaBracketIndex > 0 && (
                  <p style={{ margin: '4px 0 0' }} className={styles.irmaaFlag}>
                    Includes an IRMAA surcharge based on this location's estimated household income (~
                    {money(r.healthcare.magiAnnual)}/yr).
                  </p>
                )}
              </div>
            </details>

            {home.owns && (
              <div style={{ maxWidth: 320, marginTop: 16 }}>
                <EstimateField
                  label={`Typical home value in ${r.metroName}`}
                  estimateValue={metro.housing.typicalHomeValue}
                  estimateLabel="Typical local value — you may buy above or below this"
                  value={homeOverrides[r.metroName] || ''}
                  onChange={(v) => setHomeOverrides((prev) => ({ ...prev, [r.metroName]: v }))}
                  suffix=""
                />
                <p className={styles.helperNote} style={{ margin: 0 }}>
                  {equity?.equityReleased > 0
                    ? `At this price, moving here releases roughly ${money(equity.equityReleased)} in equity.`
                    : equity?.additionalCashNeeded > 0
                      ? `At this price, moving here requires roughly ${money(equity.additionalCashNeeded)} in additional cash.`
                      : ''}
                </p>
              </div>
            )}

            <details className={styles.dataDisclosure}>
              <summary>Data &amp; assumptions</summary>
              <div className={styles.dataDisclosureBody}>
                {Object.entries(metro.sources || {}).map(([category, info]) => (
                  <div key={category} style={{ marginBottom: 4 }}>
                    {SOURCE_CATEGORY_LABEL[category] || category}
                    <span className={`${styles.confidencePill} ${styles[CONFIDENCE_CLASS[info.confidence]] || ''}`}>
                      {CONFIDENCE_LABEL[info.confidence] || info.confidence}
                    </span>
                    {' — '}{info.year}{info.method === 'modeled' ? ', modeled estimate' : ', sourced'}
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })}

      {!isCompareMode && !showAll && total > 5 && (
        <button type="button" className={`${styles.seeAllBtn} ${styles.noPrint}`} onClick={() => setShowAll(true)}>
          See all {total} results
        </button>
      )}

      <p className={styles.disclaimer}>
        This calculator uses planning estimates for cost of living, healthcare, and climate data —
        current as of 2026, sourced from CMS (Medicare/ACA figures), regional cost indices, and NOAA climate
        normals. It is not tax, legal, financial, or insurance advice. ACA figures shown are unsubsidized
        full-price estimates; your actual premium may be lower depending on income. Replace any estimate
        above with your own numbers as you learn more, and verify current costs for your specific situation
        before making a decision.
      </p>
    </div>
  );
}
