import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getGuideHub } from '@/lib/notion';
import styles from './guides.module.css';

export const dynamic = 'force-dynamic';

// Page IDs for the two guide hub pages in Notion. These are stable IDs from
// the workspace and won't change even as the pages' content is edited.
const SLOW_TRAVEL_HUB_ID = '388995f1-23d7-8100-a8b0-fea7aaf788a0';
const TAX_ROTATION_HUB_ID = '388995f1-23d7-81f2-8429-c9103ee847b2';

function GuideSection({ emoji, hub, fallbackTitle }) {
  if (!hub) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{fallbackTitle}</h2>
        <p className={styles.empty}>This guide isn&apos;t available in this environment yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {emoji && <span className={styles.emoji}>{emoji}</span>}
        {hub.title || fallbackTitle}
      </h2>
      <div className={styles.intro} dangerouslySetInnerHTML={{ __html: hub.html }} />

      {hub.topics.length > 0 && (
        <>
          <div className={styles.topicsLabel}>Topics in this guide</div>
          <ul className={styles.topicsList}>
            {hub.topics.map((topic, i) => (
              <li key={i} className={styles.topicItem}>
                <span className={styles.topicText}>{topic.title}</span>
                <span className={styles.comingSoon}>Coming soon</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function GuidesPage() {
  const [slowTravelHub, taxRotationHub] = await Promise.all([
    getGuideHub(SLOW_TRAVEL_HUB_ID),
    getGuideHub(TAX_ROTATION_HUB_ID),
  ]);

  return (
    <main>
      <Nav />
      <div className={styles.wrap}>
        <h1 className="display" style={{ fontSize: 32 }}>Guides</h1>
        <p className={styles.sub}>
          In-depth guidance for two different kinds of location-independent retirement: testing a place before
          committing, and deliberately staying mobile long-term. The individual topic pages below are still being
          built out — this page shows what each guide covers today.
        </p>

        <GuideSection emoji="🐣" hub={slowTravelHub} fallbackTitle="Slow Travel" />
        <GuideSection emoji="🧭" hub={taxRotationHub} fallbackTitle="Tax-Residency Rotation" />
      </div>
      <Footer />
    </main>
  );
}
