import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import AudioOverview from '@/components/AudioOverview';
import styles from './how-to-use.module.css';

export const metadata = {
  title: 'How to Use This Site | Next Horizon',
  description:
    'A quick guide to which Next Horizon tool fits what you actually need — a quick recommendation, a side-by-side comparison, exact numbers, or deep research.',
};

const SCENARIOS = [
  {
    question: "I have no idea where to start.",
    answer:
      'Take the Find Your Fit quiz. It walks through your priorities — budget, climate, tax situation, healthcare, pace of life — and matches you against every published destination.',
    cta: 'Take the quiz',
    href: '/match',
  },
  {
    question: 'Just give me one specific, quick suggestion.',
    answer:
      "Answer three questions (climate, budget, visa priority) and get a single written recommendation, chosen from whichever destinations score best against your answers.",
    cta: 'Get a recommendation',
    href: '/recommend',
  },
  {
    question: "I'm deciding between two specific places.",
    answer:
      'Put any two countries or U.S. states side by side — tax treatment, visa rules, healthcare, and monthly budget defaults, pulled live from our research.',
    cta: 'Compare two destinations',
    href: '/compare',
  },
  {
    question: 'I want real numbers for my own budget.',
    answer:
      'Enter your current monthly costs and see how they stack up against a destination\u2019s defaults, line item by line item.',
    cta: 'Run the calculator',
    href: '/calculator',
  },
  {
    question: 'I want to browse everything you\u2019ve researched.',
    answer:
      'Every published country and U.S. state, with full profiles covering cost of living, healthcare, visas, tax treatment, and more.',
    cta: 'Browse all destinations',
    href: '/destinations',
  },
  {
    question: 'I want the deep dive on tax, visas, or slow travel.',
    answer:
      'Longer-form guides on international and national tax strategy, tax-residency rotation, working remotely abroad, and slow travel — including country-by-country retirement account tax treatment.',
    cta: 'Read the guides',
    href: '/guides',
  },
  {
    question: 'I keep running into terms I don\u2019t recognize.',
    answer:
      'FEIE, territorial tax, totalization agreement — plain-English definitions for the terms that come up throughout the site. Also linked automatically the first time a term appears in an article.',
    cta: 'Open the glossary',
    href: '/glossary',
  },
];

export default function HowToUsePage() {
  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon</p>
        <h1 className={styles.title}>How to use this site</h1>
        <p className={styles.sub}>
          There&apos;s more than one tool here because there&apos;s more than one way to approach
          this decision. Find the one below that matches where you actually are right now.
        </p>

        <AudioOverview variant="card" label="Prefer to listen? A 90-second overview of this site" />

        <div className={styles.cards}>
          {SCENARIOS.map((s) => (
            <div key={s.href} className={styles.card}>
              <p className={styles.question}>&quot;{s.question}&quot;</p>
              <p className={styles.answer}>{s.answer}</p>
              <Link href={s.href} className={styles.cta}>
                {s.cta} →
              </Link>
            </div>
          ))}
        </div>

        <p className={styles.footnote}>
          None of these are mutually exclusive — most people end up using two or three of them
          together: a quick recommendation to narrow things down, then Compare or a full guide to
          go deeper on the finalists.
        </p>
      </div>
      <Footer />
    </main>
  );
}
