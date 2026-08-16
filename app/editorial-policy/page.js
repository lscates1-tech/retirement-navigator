import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import styles from './editorial-policy.module.css';

export const metadata = {
  alternates: { canonical: '/editorial-policy' },
  title: 'Our Editorial Philosophy | Next Horizon',
  description:
    'How Next Horizon Insights is researched, written, and edited — a transparent look at the role human judgment and AI-assisted tools each play in our editorial process.',
};

const PRINCIPLES = [
  'Conceptually developed by a human editor.',
  'Reviewed and approved before publication.',
  'Based on thoughtful research and analysis.',
  'Edited for clarity, accuracy, and usefulness.',
  'Created with transparency and intellectual honesty.',
];

const AI_ASSISTS_WITH = [
  'Research synthesis',
  'Writing and editing',
  'Organizing information',
  'Exploring alternative perspectives',
  'Improving readability and structure',
];

const VALUES = [
  'Intellectual honesty',
  'Curiosity',
  'Evidence-based thinking',
  'Transparency',
  'Cultural respect',
  'Practical wisdom',
  'Lifelong learning',
  'Thoughtful decision-making',
];

export default function EditorialPolicyPage() {
  return (
    <main id="main-content">
      <Nav />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Next Horizon Insights</p>
        <h1 className={styles.title}>Our Editorial Philosophy</h1>

        <p className={styles.lead}>
          At Next Horizon, we believe that thoughtful decisions begin with thoughtful questions.
        </p>

        <p className={styles.body}>
          Our mission is not simply to tell people where to retire or relocate. We aim to help
          readers think more deeply about the choices that shape their lives — where they live,
          how they spend their time, what communities they join, and what kind of future they are
          intentionally creating.
        </p>

        <p className={styles.body}>
          The content published on Next Horizon reflects a combination of human judgment,
          independent research, and responsible use of modern artificial intelligence tools. We
          embrace AI as a research and writing partner in much the same way that authors have
          historically worked with editors, researchers, and subject matter experts.
        </p>

        <section className={styles.block}>
          <h2 className={styles.h2}>Every article published on Next Horizon is:</h2>
          <ul className={styles.checkList}>
            {PRINCIPLES.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <div className={styles.splitRow}>
          <section className={styles.splitCol}>
            <h2 className={styles.h2}>AI tools may assist with:</h2>
            <ul className={styles.plainList}>
              {AI_ASSISTS_WITH.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
          <section className={styles.splitCol}>
            <h2 className={styles.h2}>AI tools do not:</h2>
            <p className={styles.body} style={{ marginTop: 0 }}>
              Independently determine the editorial philosophy, conclusions, or recommendations
              presented on Next Horizon. Editorial decisions remain human.
            </p>
          </section>
        </div>

        <section className={styles.valuesSection}>
          <h2 className={styles.h2}>What we value</h2>
          <div className={styles.valuesGrid}>
            {VALUES.map((v) => (
              <span key={v} className={styles.valueBadge}>{v}</span>
            ))}
          </div>
        </section>

        <p className={styles.closing}>
          Wherever you land after reading something on Next Horizon — a new country, a new state,
          or a more deliberate version of exactly where you already are — we want you to know
          exactly how it was made.
        </p>

        <Link href="/insights" className={styles.backLink}>← Back to Next Horizon Insights</Link>
      </div>
      <Footer />
    </main>
  );
}
