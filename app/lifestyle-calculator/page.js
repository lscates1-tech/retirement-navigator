import { METRO_DEFAULTS } from '@/lib/lifestyleMetroDefaults';
import LifestyleCalculatorClient from './LifestyleCalculatorClient';

// No Notion "Metros" database exists yet (see lib/lifestyleMetroDefaults.js) —
// this page runs entirely off the JS fallback dataset for now. Once that
// database is created, this should mirror the getCountries()/getStates()
// pattern in lib/notion.js: fetch live, fall back to this file if the fetch
// comes back empty.
export const revalidate = 3600;

export const metadata = {
  alternates: { canonical: '/lifestyle-calculator' },
  title: 'Lifestyle Calculator | Next Horizon',
  description: 'Compare U.S. locations on both financial affordability and lifestyle fit — real cost, healthcare, climate, and travel data, weighted by what matters to you.',
};

export default function LifestyleCalculatorPage() {
  const metroList = Object.entries(METRO_DEFAULTS)
    .filter(([, data]) => data.status !== 'pending-data')
    .map(([name, data]) => ({ name, state: data.state, region: data.region, characterTag: data.characterTag }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <LifestyleCalculatorClient metroDefaults={METRO_DEFAULTS} metroList={metroList} />;
}
