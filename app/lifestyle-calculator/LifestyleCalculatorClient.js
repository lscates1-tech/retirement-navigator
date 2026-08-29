'use client';

import { useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import styles from './lifestyle-calculator.module.css';
import { buildHouseholdPhases, DEFAULT_CLIMATE_PREFERENCES } from '@/lib/lifestyleCalculator';
import StepAboutYou from './steps/StepAboutYou';
import StepIncome from './steps/StepIncome';
import StepHome from './steps/StepHome';
import StepHealthcare from './steps/StepHealthcare';
import StepPriorities from './steps/StepPriorities';
import StepLocations from './steps/StepLocations';
import ResultsView from './ResultsView';

const STEP_COUNT = 6;

function blankPhaseField(v = 0) {
  return { phase1: v, phase2: v };
}

function newPerson(age = 65) {
  return {
    name: '',
    age,
    retirementStatus: 'retired',
    socialSecurity: blankPhaseField(),
    pension: blankPhaseField(),
    iraWithdrawal: blankPhaseField(),
    employment: blankPhaseField(),
    other: blankPhaseField(),
    coveragePhase1: age >= 65 ? 'medicare-medigap-partd' : 'aca',
    coveragePhase2: 'medicare-medigap-partd',
    actualPremiumOverridePhase1: null,
    actualPremiumOverridePhase2: null,
  };
}

const DEFAULT_PRIORITIES = {
  financialAffordability: 'important',
  healthcareAccess: 'important',
  climate: 'somewhat',
  fourSeasonVariation: 'somewhat',
  summerHeatTolerance: 'somewhat',
  winterColdTolerance: 'somewhat',
  internationalAirportAccess: 'somewhat',
  travelToEurope: 'somewhat',
  travelToSouthAmerica: 'not',
  natureScenery: 'somewhat',
  walkability: 'somewhat',
  cityAmenities: 'somewhat',
  quietSmallTownFeel: 'somewhat',
  disasterInsuranceRisk: 'somewhat',
  climatePreferences: { ...DEFAULT_CLIMATE_PREFERENCES },
};

function initialFormData() {
  return {
    maritalStatus: 'single',
    people: [newPerson(65)],
    home: {
      owns: true,
      paidOff: true,
      currentValueLow: 0,
      currentValueHigh: 0,
      sellingCostPct: 0.07,
      additionalCashAvailable: 0,
      maxRent: 0,
    },
    priorities: DEFAULT_PRIORITIES,
    locationMode: 'explore',
    selectedMetros: [],
  };
}

export default function LifestyleCalculatorClient({ metroDefaults, metroList }) {
  const [step, setStep] = useState(1); // 1-6, then 'results'
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const setMaritalStatus = (status) => {
    setFormData((prev) => {
      if (status === 'couple' && prev.people.length === 1) {
        return { ...prev, maritalStatus: status, people: [...prev.people, newPerson(63)] };
      }
      if (status === 'single' && prev.people.length === 2) {
        return { ...prev, maritalStatus: status, people: [prev.people[0]] };
      }
      return { ...prev, maritalStatus: status };
    });
  };

  const updatePersonField = (index, field, value) => {
    setFormData((prev) => {
      const people = [...prev.people];
      people[index] = { ...people[index], [field]: value };
      return { ...prev, people };
    });
  };

  const updatePersonPhaseField = (index, field, phase, value) => {
    setFormData((prev) => {
      const people = [...prev.people];
      people[index] = { ...people[index], [field]: { ...people[index][field], [phase]: value } };
      return { ...prev, people };
    });
  };

  const updateHomeField = (field, value) => {
    setFormData((prev) => ({ ...prev, home: { ...prev.home, [field]: value } }));
  };

  const updatePriority = (key, value) => {
    setFormData((prev) => ({ ...prev, priorities: { ...prev.priorities, [key]: value } }));
  };

  const updateClimatePreference = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      priorities: { ...prev.priorities, climatePreferences: { ...prev.priorities.climatePreferences, [key]: value } },
    }));
  };

  const setLocationMode = (mode) => setFormData((prev) => ({ ...prev, locationMode: mode }));

  const toggleMetro = (name) => {
    setFormData((prev) => {
      const has = prev.selectedMetros.includes(name);
      return {
        ...prev,
        selectedMetros: has ? prev.selectedMetros.filter((n) => n !== name) : [...prev.selectedMetros, name],
      };
    });
  };

  const { hasBridgePeriod, bridgeYears } = useMemo(
    () => buildHouseholdPhases(formData.people),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(formData.people.map((p) => p.age))],
  );

  const activeMetroNames = formData.locationMode === 'compare' && formData.selectedMetros.length >= 2
    ? formData.selectedMetros
    : metroList.map((m) => m.name);

  const canProceed = () => {
    if (step === 6 && formData.locationMode === 'compare') return formData.selectedMetros.length >= 2;
    return true;
  };

  const goNext = () => {
    if (step < STEP_COUNT) setStep(step + 1);
    else setShowResults(true);
  };
  const goBack = () => {
    if (showResults) { setShowResults(false); return; }
    if (step > 1) setStep(step - 1);
  };

  const stepProps = { formData, hasBridgePeriod, bridgeYears };

  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        {!showResults && (
          <>
            <h1 className={styles.title}>Lifestyle Calculator</h1>
            <p className={styles.subtitle}>Find where your money supports the life you want.</p>

            <div className={styles.progressRow}>
              {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={`${styles.progressDot} ${n < step ? styles.progressDotDone : ''} ${n === step ? styles.progressDotActive : ''}`}
                />
              ))}
            </div>

            {step === 1 && <StepAboutYou {...stepProps} setMaritalStatus={setMaritalStatus} updatePersonField={updatePersonField} />}
            {step === 2 && <StepIncome {...stepProps} updatePersonPhaseField={updatePersonPhaseField} />}
            {step === 3 && <StepHome {...stepProps} updateHomeField={updateHomeField} />}
            {step === 4 && <StepHealthcare {...stepProps} updatePersonField={updatePersonField} />}
            {step === 5 && <StepPriorities {...stepProps} updatePriority={updatePriority} updateClimatePreference={updateClimatePreference} />}
            {step === 6 && (
              <StepLocations
                {...stepProps}
                metroList={metroList}
                setLocationMode={setLocationMode}
                toggleMetro={toggleMetro}
              />
            )}

            <div className={styles.navRow}>
              <button type="button" className={styles.btnSecondary} onClick={goBack} disabled={step === 1} style={step === 1 ? { visibility: 'hidden' } : undefined}>
                Back
              </button>
              <button type="button" className={styles.btnPrimary} onClick={goNext} disabled={!canProceed()}>
                {step === STEP_COUNT ? 'See my results' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {showResults && (
          <>
            <ResultsView
              metroDefaults={metroDefaults}
              metroNames={activeMetroNames}
              formData={formData}
              onEditAnswers={() => { setStep(1); setShowResults(false); }}
            />
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
