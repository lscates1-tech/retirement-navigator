# Retirement Navigator

A real, working Next.js site — built from the Retirement Navigator Notion workspace.
This is a genuine first slice, not a mockup: it builds, runs, and the calculator
is fully interactive right now using verified 2026 cost data. Photos and live
Notion sync are wired up with real code but need API keys to switch on (see below). 

## What's actually working right now

- **Homepage** (`/`) — hero, the "Two Paths" section, calculator teaser, and a
  destination grid, in the approved indigo/brass/linen design.
- **Calculator** (`/calculator`) — fully functional. Pick a destination, toggle
  single/couple, toggle rent/own, adjust any number, and it recalculates the
  affordability rating and category breakdown live. Running on the verified
  2026 data in `lib/destinationDefaults.js`.
- **Placeholder pages** for `/destinations`, `/compare`, `/guides`, and
  `/destinations/[slug]` — these exist so navigation doesn't break, but have no
  real content yet. See "What's left" below.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The site works immediately with no API keys —
the calculator uses the static fallback data, and destination cards show a
labeled placeholder block instead of a photo.

## Turning on real photos (Unsplash)

1. Create a free app at https://unsplash.com/oauth/applications
2. Copy your Access Key
3. Copy `.env.local.example` to `.env.local` and paste it into `UNSPLASH_ACCESS_KEY`
4. Restart `npm run dev` — the homepage will now show real photos with attribution

`lib/photos.js` has the fetch logic and comments. Pexels is a solid alternative
if you'd rather use that instead (similar API shape).

## Turning on live Notion sync

This is the real fix for the "the calculator doesn't update when I edit Notion"
problem from earlier in the project. The flow:

1. Create an internal integration: https://www.notion.so/my-integrations
2. Open your Countries database in Notion → `•••` menu → Connections → add
   the integration. Do the same for the US States database.
3. Copy each database's ID from its URL (the 32-character ID right after your
   workspace name and before any `?v=`)
4. Add `NOTION_TOKEN`, `NOTION_COUNTRIES_DB_ID`, and `NOTION_STATES_DB_ID` to
   `.env.local`
5. `lib/notion.js` already has working `getCountries()`, `getStates()`, and
   `getAllDestinations()` functions — they just aren't called from any page
   yet. The calculator currently reads from `lib/destinationDefaults.js`
   instead. Swapping the calculator (and a future destinations listing page)
   to call these instead is the next real step.

**Important:** this code runs server-side only. The Notion token never reaches
the browser, which is what makes this safe — unlike the chat-widget prototypes
from earlier, which could never have done this securely.

## Deploying

The standard path is Vercel (the company behind Next.js):

1. Push this project to a GitHub repository
2. Go to https://vercel.com, sign up, "Import Project," pick the repo
3. Add your environment variables (the same ones from `.env.local`) in the
   Vercel project settings
4. Deploy — Vercel gives you a free `*.vercel.app` URL immediately
5. To use your own domain: buy it anywhere (Namecheap, Google Domains, etc.),
   then in Vercel project settings → Domains, add it and follow the DNS
   instructions Vercel gives you

Vercel's free tier is very likely sufficient for this site's traffic level
to start.

## What's left (in rough priority order)

1. **Wire the calculator and a real `/destinations` page to `lib/notion.js`**
   instead of the static fallback — this is what makes "edit Notion, site
   updates" actually true.
2. **Build the real destination detail pages** (`/destinations/[slug]`) —
   pull the full country/state profile content from Notion.
3. **Build the real `/compare` page** — port the two-way comparator prototype
   from the chat exploration into a real component, backed by live data.
4. **Pick and connect a domain.**
5. **Affiliate links** — once there's real traffic, integrate the
   partnerships discussed (international insurance, money transfer,
   relocation services).
6. **Legal/disclaimer page** — important given this site touches tax and
   financial topics; a dedicated `/disclaimer` page is better than relying
   on the footer line alone.
7. **Analytics** — Vercel Analytics or Plausible are both simple adds once deployed.

## Design system reference

- Colors, fonts, and the "passport stamp" motif are defined in
  `app/globals.css` and `app/page.module.css`. Change the CSS variables in
  `globals.css` to retheme the whole site from one place.
- Fonts: Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (data/numbers).
