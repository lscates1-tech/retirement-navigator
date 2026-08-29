'use client';

import styles from '../lifestyle-calculator.module.css';

const RETIREMENT_STATUS_OPTIONS = [
  { value: 'retired', label: 'Retired' },
  { value: 'planning', label: 'Planning retirement' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'remote', label: 'Working remotely' },
  { value: 'other', label: 'Other' },
];

export default function StepAboutYou({ formData, setMaritalStatus, updatePersonField }) {
  const { maritalStatus, people } = formData;

  return (
    <div>
      <div className={styles.stepLabel}>Step 1 of 6</div>
      <h2 className={styles.stepTitle}>About you</h2>
      <p className={styles.stepIntro}>
        This tells us whether your household is Medicare-eligible, pre-Medicare, or a mix of both —
        which changes how we estimate healthcare costs later.
      </p>

      <div className={styles.card}>
        <label className={styles.label} id="household-group-label">Household</label>
        <div className={styles.radioRow} style={{ marginBottom: 24 }} role="radiogroup" aria-labelledby="household-group-label">
          {[
            { value: 'single', label: 'Just me' },
            { value: 'couple', label: 'Me and a spouse/partner' },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`${styles.radioOption} ${maritalStatus === opt.value ? styles.radioOptionActive : ''}`}
            >
              <input
                type="radio"
                name="maritalStatus"
                value={opt.value}
                checked={maritalStatus === opt.value}
                onChange={() => setMaritalStatus(opt.value)}
                className={styles.visuallyHiddenInput}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {people.map((person, i) => (
          <div key={i} className={styles.personBlock}>
            <div className={styles.personBlockTitle}>{maritalStatus === 'couple' ? (i === 0 ? 'You' : 'Spouse / Partner') : 'You'}</div>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`age-${i}`}>Current age</label>
                <input
                  id={`age-${i}`}
                  type="number"
                  onFocus={(e) => e.target.select()}
                  className={styles.input}
                  value={person.age}
                  onChange={(e) => updatePersonField(i, 'age', Number(e.target.value) || 0)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`retirement-status-${i}`}>Retirement status</label>
                <select
                  id={`retirement-status-${i}`}
                  className={styles.select}
                  value={person.retirementStatus}
                  onChange={(e) => updatePersonField(i, 'retirementStatus', e.target.value)}
                >
                  {RETIREMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className={styles.helperNote}>
              {person.age >= 65
                ? 'Medicare-eligible now.'
                : `Medicare-eligible in about ${Math.max(0, 65 - person.age)} year${65 - person.age === 1 ? '' : 's'}.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
