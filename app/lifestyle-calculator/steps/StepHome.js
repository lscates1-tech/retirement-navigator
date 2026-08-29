'use client';

import styles from '../lifestyle-calculator.module.css';

export default function StepHome({ formData, updateHomeField }) {
  const { home } = formData;

  return (
    <div>
      <div className={styles.stepLabel}>Step 3 of 6</div>
      <h2 className={styles.stepTitle}>Your home</h2>
      <p className={styles.stepIntro}>
        We keep the one-time capital math (what selling releases, what a replacement home costs)
        completely separate from your monthly budget — they're different decisions.
      </p>

      <div className={styles.card}>
        <label className={styles.label} id="own-rent-group-label">Do you rent or own?</label>
        <div className={styles.radioRow} style={{ marginBottom: 20 }} role="radiogroup" aria-labelledby="own-rent-group-label">
          {[{ value: true, label: 'Own' }, { value: false, label: 'Rent' }].map((opt) => (
            <label
              key={String(opt.value)}
              className={`${styles.radioOption} ${home.owns === opt.value ? styles.radioOptionActive : ''}`}
            >
              <input
                type="radio"
                name="ownsHome"
                checked={home.owns === opt.value}
                onChange={() => updateHomeField('owns', opt.value)}
                className={styles.visuallyHiddenInput}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {home.owns ? (
          <>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={home.paidOff}
                onChange={(e) => updateHomeField('paidOff', e.target.checked)}
              />
              My current home is paid off
            </label>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="home-value-low">Current estimated value — low</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                  <input
                    type="number"
                    className={styles.input}
                    id="home-value-low"
                    value={home.currentValueLow}
                    onChange={(e) => updateHomeField('currentValueLow', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="home-value-high">Current estimated value — high</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                  <input
                    type="number"
                    className={styles.input}
                    id="home-value-high"
                    value={home.currentValueHigh}
                    onChange={(e) => updateHomeField('currentValueHigh', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="selling-cost-pct">Selling-cost allowance</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.5"
                    id="selling-cost-pct"
                    className={styles.input}
                    value={home.sellingCostPct * 100}
                    onChange={(e) => updateHomeField('sellingCostPct', (Number(e.target.value) || 0) / 100)}
                  />
                  <span className={styles.label} style={{ marginLeft: 6, marginBottom: 0 }}>%</span>
                </div>
                <p className={styles.helperNote} style={{ margin: '6px 0 0' }}>Covers agent commission, closing costs, and typical repairs. 7% is a common planning estimate.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="additional-cash">Additional cash you'd add toward a new home</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
                  <input
                    type="number"
                    className={styles.input}
                    id="additional-cash"
                    value={home.additionalCashAvailable}
                    onChange={(e) => updateHomeField('additionalCashAvailable', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="max-rent">Maximum desired monthly rent</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className={styles.label} style={{ marginRight: 6, marginBottom: 0 }}>$</span>
              <input
                type="number"
                className={styles.input}
                id="max-rent"
                value={home.maxRent}
                onChange={(e) => updateHomeField('maxRent', Number(e.target.value) || 0)}
              />
            </div>
            <p className={styles.helperNote} style={{ margin: '6px 0 0' }}>
              We'll still show each metro's typical rent for comparison — this is just for your own reference.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
