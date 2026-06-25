// Verified 2026 monthly cost defaults (single person, USD).
// Mirrors the "Budget Defaults" fields in the Notion Countries and US States
// databases. Once lib/notion.js is wired up with real credentials, these
// values can be replaced by the live fetch — this file is the safety net,
// not the long-term source of truth.

export const COUNTRY_DEFAULTS = {
  Portugal: { rent: 1000, own: 280, healthcare: 120, transportation: 50, groceries: 250, utilities: 130, phone: 60, dining: 150, misc: 120, taxSystem: 'Worldwide' },
  Spain: { rent: 800, own: 280, healthcare: 80, transportation: 45, groceries: 200, utilities: 90, phone: 45, dining: 120, misc: 100, taxSystem: 'Worldwide' },
  France: { rent: 850, own: 320, healthcare: 150, transportation: 80, groceries: 350, utilities: 180, phone: 50, dining: 250, misc: 170, taxSystem: 'Worldwide' },
  Italy: { rent: 600, own: 280, healthcare: 35, transportation: 55, groceries: 250, utilities: 165, phone: 40, dining: 180, misc: 130, taxSystem: 'Worldwide' },
  Mexico: { rent: 700, own: 200, healthcare: 60, transportation: 80, groceries: 275, utilities: 70, phone: 40, dining: 150, misc: 100, taxSystem: 'Mixed/Unclear' },
  'Costa Rica': { rent: 800, own: 250, healthcare: 110, transportation: 80, groceries: 300, utilities: 135, phone: 45, dining: 170, misc: 140, taxSystem: 'Territorial' },
  Panama: { rent: 700, own: 250, healthcare: 120, transportation: 60, groceries: 280, utilities: 70, phone: 35, dining: 150, misc: 130, taxSystem: 'Territorial' },
  Argentina: { rent: 650, own: 180, healthcare: 150, transportation: 30, groceries: 280, utilities: 70, phone: 25, dining: 150, misc: 130, taxSystem: 'Worldwide' },
};

export const STATE_DEFAULTS = {
  Texas: { rent: 1300, own: 450, healthcare: 480, transportation: 200, groceries: 380, utilities: 180, phone: 80, dining: 300, misc: 190 },
  Florida: { rent: 1350, own: 600, healthcare: 500, transportation: 180, groceries: 400, utilities: 170, phone: 80, dining: 350, misc: 200 },
  Nevada: { rent: 1400, own: 350, healthcare: 460, transportation: 170, groceries: 380, utilities: 150, phone: 80, dining: 320, misc: 190 },
  Tennessee: { rent: 1250, own: 300, healthcare: 430, transportation: 160, groceries: 350, utilities: 150, phone: 75, dining: 300, misc: 180 },
  Washington: { rent: 1900, own: 400, healthcare: 470, transportation: 150, groceries: 420, utilities: 140, phone: 80, dining: 380, misc: 210 },
  Arizona: { rent: 1500, own: 330, healthcare: 450, transportation: 160, groceries: 370, utilities: 170, phone: 75, dining: 330, misc: 190 },
  Colorado: { rent: 1500, own: 380, healthcare: 480, transportation: 160, groceries: 380, utilities: 130, phone: 80, dining: 360, misc: 200 },
  Oregon: { rent: 1600, own: 350, healthcare: 460, transportation: 150, groceries: 400, utilities: 130, phone: 75, dining: 360, misc: 200 },
  Georgia: { rent: 1400, own: 320, healthcare: 440, transportation: 160, groceries: 390, utilities: 160, phone: 75, dining: 330, misc: 190 },
  'North Carolina': { rent: 1350, own: 310, healthcare: 440, transportation: 155, groceries: 380, utilities: 145, phone: 72, dining: 320, misc: 185 },
  'South Carolina': { rent: 1300, own: 300, healthcare: 430, transportation: 150, groceries: 370, utilities: 150, phone: 70, dining: 310, misc: 180 },
  'New Mexico': { rent: 1200, own: 250, healthcare: 420, transportation: 130, groceries: 330, utilities: 120, phone: 65, dining: 280, misc: 160 },
};

// Couples don't double every category evenly — this mirrors the multipliers
// agreed on earlier (housing/utilities mostly shared, healthcare/dining scale up more).
export const COUPLE_MULTIPLIER = {
  rent: 1.1,
  own: 1.1,
  healthcare: 1.85,
  transportation: 1.3,
  groceries: 1.6,
  utilities: 1.15,
  phone: 1.4,
  dining: 1.7,
  misc: 1.5,
};
