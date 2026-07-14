'use client';

import { useMemo, useState } from 'react';
import styles from './visa-comparison.module.css';

const DIFFICULTY_ORDER = { Easy: 0, Moderate: 1, Complex: 2 };

function difficultyClass(level) {
  if (level === 'Easy') return styles.diffEasy;
  if (level === 'Moderate') return styles.diffModerate;
  if (level === 'Complex') return styles.diffComplex;
  return '';
}

// Every distinct difficulty value actually present in the data, in a fixed
// display order — built from the data itself rather than hardcoded, so a
// new value added in Notion shows up here automatically instead of being
// silently excluded from the filter chips.
function getDifficultyOptions(rows) {
  const present = new Set(rows.map((d) => d.applicationDifficulty).filter(Boolean));
  return ['Easy', 'Moderate', 'Complex'].filter((d) => present.has(d));
}

const SORTS = {
  visaFirst: {
    label: 'Has visa, then difficulty',
    compare: (a, b) => {
      const hasVisaDiff = (a.hasDedicatedVisa === 'Yes' ? 0 : 1) - (b.hasDedicatedVisa === 'Yes' ? 0 : 1);
      if (hasVisaDiff !== 0) return hasVisaDiff;
      const diffDiff = (DIFFICULTY_ORDER[a.applicationDifficulty] ?? 3) - (DIFFICULTY_ORDER[b.applicationDifficulty] ?? 3);
      if (diffDiff !== 0) return diffDiff;
      return a.country.localeCompare(b.country);
    },
  },
  alphabetical: {
    label: 'Country A\u2013Z',
    compare: (a, b) => a.country.localeCompare(b.country),
  },
  difficulty: {
    label: 'Easiest first',
    compare: (a, b) => {
      const diffDiff = (DIFFICULTY_ORDER[a.applicationDifficulty] ?? 3) - (DIFFICULTY_ORDER[b.applicationDifficulty] ?? 3);
      if (diffDiff !== 0) return diffDiff;
      return a.country.localeCompare(b.country);
    },
  },
};

function VisaCard({ d }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.countryName}>{d.country}</h2>
        {d.applicationDifficulty && (
          <span className={`${styles.diffBadge} ${difficultyClass(d.applicationDifficulty)}`}>
            {d.applicationDifficulty}
          </span>
        )}
      </div>
      <div className={styles.visaName}>{d.visaName}</div>
      <div className={styles.detailsGrid}>
        {d.incomeThreshold && (
          <div>
            <div className={styles.detailLabel}>Income Threshold</div>
            <div className={styles.detailValue}>{d.incomeThreshold}</div>
          </div>
        )}
        {d.duration && (
          <div>
            <div className={styles.detailLabel}>Duration</div>
            <div className={styles.detailValue}>{d.duration}</div>
          </div>
        )}
      </div>
      {d.taxTreatmentNote && (
        <div className={styles.taxNote}>
          <strong>Tax note:</strong> {d.taxTreatmentNote}
        </div>
      )}
    </div>
  );
}

export default function VisaComparisonClient({ rows }) {
  const [hasVisaFilter, setHasVisaFilter] = useState('all'); // 'all' | 'yes' | 'no'
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('visaFirst');

  const difficultyOptions = useMemo(() => getDifficultyOptions(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((d) => {
        if (hasVisaFilter === 'yes' && d.hasDedicatedVisa !== 'Yes') return false;
        if (hasVisaFilter === 'no' && d.hasDedicatedVisa === 'Yes') return false;
        if (difficultyFilter !== 'all' && d.applicationDifficulty !== difficultyFilter) return false;
        if (q && !d.country.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(SORTS[sortKey].compare);
  }, [rows, hasVisaFilter, difficultyFilter, query, sortKey]);

  const totalWithVisa = rows.filter((d) => d.hasDedicatedVisa === 'Yes').length;

  return (
    <>
      <p className={styles.sub}>
        {rows.length} countries compared on visa availability, income threshold, duration, and tax
        treatment. {totalWithVisa} have a dedicated digital nomad visa program; {rows.length - totalWithVisa}{' '}
        rely on standard visa categories not specifically built for remote income. This is not immigration or
        tax advice — confirm current requirements directly before applying.
      </p>

      <div className={styles.controls}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by country…"
          className={styles.searchInput}
          aria-label="Search by country"
        />

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Dedicated visa</span>
          {[
            { value: 'all', label: 'All' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHasVisaFilter(opt.value)}
              className={hasVisaFilter === opt.value ? styles.chipActive : styles.chip}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Difficulty</span>
          <button
            type="button"
            onClick={() => setDifficultyFilter('all')}
            className={difficultyFilter === 'all' ? styles.chipActive : styles.chip}
          >
            All
          </button>
          {difficultyOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDifficultyFilter(opt)}
              className={difficultyFilter === opt ? styles.chipActive : styles.chip}
            >
              {opt}
            </button>
          ))}
        </div>

        <label className={styles.sortRow}>
          <span className={styles.filterGroupLabel}>Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className={styles.sortSelect}
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.resultCount}>
        {filtered.length} of {rows.length} {filtered.length === 1 ? 'country' : 'countries'} shown
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No countries match these filters. Try clearing one.</p>
      ) : (
        <div className={styles.cards}>
          {filtered.map((d) => <VisaCard key={d.id} d={d} />)}
        </div>
      )}
    </>
  );
}
