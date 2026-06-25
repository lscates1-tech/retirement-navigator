import { getCountries, getStates } from '@/lib/notion';
import { COUNTRY_DEFAULTS, STATE_DEFAULTS } from '@/lib/destinationDefaults';
import CalculatorClient from './CalculatorClient';

// Re-check Notion at most once per hour rather than on every single request.
export const revalidate = 3600;

function toDefaultsMap(notionList) {
  const map = {};
  for (const d of notionList) {
    if (!d.name) continue;
    const b = d.budgetDefaults || {};
    map[d.name] = {
      rent: Number(b.rent) || 0,
      own: Number(b.own) || 0,
      healthcare: Number(b.healthcare) || 0,
      transportation: Number(b.transportation) || 0,
      groceries: Number(b.groceries) || 0,
      utilities: Number(b.utilities) || 0,
      phone: Number(b.phone) || 0,
      dining: Number(b.dining) || 0,
      misc: Number(b.misc) || 0,
    };
  }
  return map;
}

export default async function CalculatorPage() {
  const [notionCountries, notionStates] = await Promise.all([getCountries(), getStates()]);

  const liveCountries = notionCountries && notionCountries.length ? toDefaultsMap(notionCountries) : null;
  const liveStates = notionStates && notionStates.length ? toDefaultsMap(notionStates) : null;

  const countryDefaults = liveCountries || COUNTRY_DEFAULTS;
  const stateDefaults = liveStates || STATE_DEFAULTS;
  const dataSource = liveCountries || liveStates ? 'notion' : 'fallback';

  return (
    <CalculatorClient
      countryDefaults={countryDefaults}
      stateDefaults={stateDefaults}
      dataSource={dataSource}
    />
  );
}
