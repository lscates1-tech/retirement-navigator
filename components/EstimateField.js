'use client';

import styles from './EstimateField.module.css';

/**
 * Every meaningful estimated value in the Lifestyle Calculator renders
 * through this component: an estimate is shown by default, with a clear
 * path to replace it with a real number. Controlled from the parent —
 * `value` is the override (empty string / null means "using the estimate").
 */
export default function EstimateField({
  label,
  estimateValue,
  estimateLabel = 'Estimated',
  value,
  onChange,
  prefix = '$',
  suffix = '/mo',
  helpText,
  id,
}) {
  const isOverridden = value !== '' && value != null;
  const fieldId = id || label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={fieldId}>{label}</label>
        {isOverridden ? (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => onChange('')}
          >
            Use estimate (${Number(estimateValue).toLocaleString()})
          </button>
        ) : (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => onChange(String(estimateValue))}
          >
            Use your own amount
          </button>
        )}
      </div>
      <div className={styles.inputRow}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          id={fieldId}
          type="number"
          className={styles.input}
          value={isOverridden ? value : estimateValue}
          readOnly={!isOverridden}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {isOverridden ? (
        <div className={styles.yourAmountTag}>Your amount</div>
      ) : (
        <div className={styles.estimateTag}>{estimateLabel} — you can replace this once you have a real number</div>
      )}
      {helpText && <div className={styles.helpText}>{helpText}</div>}
    </div>
  );
}
