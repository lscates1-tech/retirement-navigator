'use client';

import styles from '../lifestyle-calculator.module.css';

export default function StepLocations({ formData, metroList, setLocationMode, toggleMetro }) {
  const { locationMode, selectedMetros } = formData;

  return (
    <div>
      <div className={styles.stepLabel}>Step 6 of 6</div>
      <h2 className={styles.stepTitle}>Locations</h2>
      <p className={styles.stepIntro}>
        We'll compare the {metroList.length} locations currently available in the Next Horizon database.
      </p>

      <div className={styles.card}>
        <div className={styles.radioRow} style={{ marginBottom: 20 }} role="radiogroup" aria-label="Location comparison mode">
          <label className={`${styles.radioOption} ${locationMode === 'explore' ? styles.radioOptionActive : ''}`}>
            <input
              type="radio"
              name="locationMode"
              checked={locationMode === 'explore'}
              onChange={() => setLocationMode('explore')}
              className={styles.visuallyHiddenInput}
            />
            Explore for me
          </label>
          <label className={`${styles.radioOption} ${locationMode === 'compare' ? styles.radioOptionActive : ''}`}>
            <input
              type="radio"
              name="locationMode"
              checked={locationMode === 'compare'}
              onChange={() => setLocationMode('compare')}
              className={styles.visuallyHiddenInput}
            />
            Compare places I choose
          </label>
        </div>

        {locationMode === 'explore' ? (
          <p className={styles.helperNote}>
            We'll score all {metroList.length} locations currently available in the Next Horizon database
            and show your strongest matches — not every city in America. As we add more locations, this
            list grows.
          </p>
        ) : (
          <>
            <p className={styles.helperNote}>Choose 2–6 of the locations currently available below for the clearest comparison. You can select more, but the table gets denser.</p>
            {selectedMetros.length > 6 && (
              <p className={styles.helperNote} style={{ color: 'var(--stamp)' }}>
                You've selected {selectedMetros.length} locations — the comparison table works fine, but it'll be easier to scan with 6 or fewer.
              </p>
            )}
            <div className={styles.metroGrid} role="group" aria-label="Metros to compare">
              {metroList.map((metro) => {
                const active = selectedMetros.includes(metro.name);
                return (
                  <label
                    key={metro.name}
                    className={`${styles.metroOption} ${active ? styles.metroOptionActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleMetro(metro.name)}
                    />
                    <div>
                      <div className={styles.metroOptionName}>{metro.name}</div>
                      <div className={styles.metroOptionRegion}>{metro.region} · {metro.characterTag}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
