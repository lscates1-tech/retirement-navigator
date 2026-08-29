'use client';

import styles from '../lifestyle-calculator.module.css';

const IMPORTANCE_OPTIONS = [
  { value: 'not', label: 'Not important' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'important', label: 'Important' },
  { value: 'very', label: 'Very important' },
];

const PRIORITY_GROUPS = [
  {
    heading: 'Financial & healthcare',
    items: [
      { key: 'financialAffordability', label: 'Financial affordability' },
      { key: 'healthcareAccess', label: 'Healthcare access & quality' },
    ],
  },
  {
    heading: 'Climate — how much it matters',
    items: [
      { key: 'climate', label: 'Climate overall' },
      { key: 'fourSeasonVariation', label: 'Having four distinct seasons' },
      { key: 'summerHeatTolerance', label: 'Summer heat' },
      { key: 'winterColdTolerance', label: 'Winter cold' },
    ],
  },
  {
    heading: 'Travel',
    items: [
      { key: 'internationalAirportAccess', label: 'International airport access' },
      { key: 'travelToEurope', label: 'Easy travel to Europe' },
      { key: 'travelToSouthAmerica', label: 'Easy travel to South America' },
    ],
  },
  {
    heading: 'Lifestyle',
    items: [
      { key: 'natureScenery', label: 'Nature & scenery' },
      { key: 'walkability', label: 'Walkability' },
      { key: 'cityAmenities', label: 'City amenities' },
      { key: 'quietSmallTownFeel', label: 'Quiet / small-town feel' },
    ],
  },
  {
    heading: 'Risk',
    items: [
      { key: 'disasterInsuranceRisk', label: 'Disaster & insurance risk' },
    ],
  },
];

const SUMMER_HEAT_OPTIONS = [
  { value: 'prefer-hot', label: 'Prefer hot summers' },
  { value: 'warm-fine', label: 'Warm is fine' },
  { value: 'prefer-mild', label: 'Prefer mild summers' },
  { value: 'avoid-extreme-heat', label: 'Strongly want to avoid extreme heat' },
];
const HUMIDITY_OPTIONS = [
  { value: 'no-preference', label: 'Humidity doesn\u2019t bother me' },
  { value: 'prefer-moderate', label: 'Prefer moderate humidity' },
  { value: 'prefer-drier', label: 'Prefer lower humidity / drier climate' },
];
const WINTER_OPTIONS = [
  { value: 'prefer-mild', label: 'Prefer mild winters' },
  { value: 'some-cold-fine', label: 'Some cold is fine' },
  { value: 'enjoy-real-winter', label: 'Enjoy real winter' },
  { value: 'snow-cold-fine', label: 'Snow/cold doesn\u2019t bother me' },
];
const SEASON_OPTIONS = [
  { value: 'dont-care', label: 'Don\u2019t care about seasons' },
  { value: 'prefer-some-change', label: 'Prefer some seasonal change' },
  { value: 'four-distinct-seasons-important', label: 'Four distinct seasons are important' },
];

export default function StepPriorities({ formData, updatePriority, updateClimatePreference }) {
  const { priorities } = formData;

  return (
    <div>
      <div className={styles.stepLabel}>Step 5 of 6</div>
      <h2 className={styles.stepTitle}>Your priorities</h2>
      <p className={styles.stepIntro}>
        Rate how much each factor matters to you. This sets how heavily each one weighs in your Overall Fit score.
      </p>

      <div className={styles.card}>
        {PRIORITY_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className={styles.subheading}>{group.heading}</div>
            {group.items.map((item) => (
              <div key={item.key} className={styles.priorityRow}>
                <div className={styles.priorityLabel}>{item.label}</div>
                <div className={styles.priorityOptions}>
                  {IMPORTANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.priorityChip} ${priorities[item.key] === opt.value ? styles.priorityChipActive : ''}`}
                      onClick={() => updatePriority(item.key, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.subheading} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          Climate — what you actually want
        </div>
        <p className={styles.helperNote} style={{ marginTop: -4 }}>
          This is separate from how much climate matters to you above — this tells us which direction you want it to go.
        </p>
        <div className={styles.fieldsGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="climate-summer-heat">Summer heat</label>
            <select
              id="climate-summer-heat"
              className={styles.select}
              value={priorities.climatePreferences.summerHeat}
              onChange={(e) => updateClimatePreference('summerHeat', e.target.value)}
            >
              {SUMMER_HEAT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="climate-humidity">Humidity</label>
            <select
              id="climate-humidity"
              className={styles.select}
              value={priorities.climatePreferences.humidity}
              onChange={(e) => updateClimatePreference('humidity', e.target.value)}
            >
              {HUMIDITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="climate-winter">Winter</label>
            <select
              id="climate-winter"
              className={styles.select}
              value={priorities.climatePreferences.winter}
              onChange={(e) => updateClimatePreference('winter', e.target.value)}
            >
              {WINTER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="climate-seasonal-variation">Seasonal variation</label>
            <select
              id="climate-seasonal-variation"
              className={styles.select}
              value={priorities.climatePreferences.seasonalVariation}
              onChange={(e) => updateClimatePreference('seasonalVariation', e.target.value)}
            >
              {SEASON_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
