import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import styles from './about.module.css';

export const metadata = {
  title: 'About — Next Horizon',
};

export default function AboutPage() {
  return (
    <main id="main-content">
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>About Next Horizon</h1>
          <p className={styles.heroLede}>
            Next Horizon is guided by a simple philosophy: people make better life decisions when
            they have clear, trustworthy information.
          </p>
        </div>
      </div>

      <div className={styles.wrap}>
        <article className={styles.article}>
          <p>
            As a registered nurse, I learned that the best outcomes often come not from making decisions for
            people, but from giving them the knowledge, support, and environment they need to make informed
            choices. That philosophy guided my nursing career, and it became the foundation for Next
            Horizon.
          </p>

          <p>
            Rather than telling you where you should retire, my goal is to help you understand your options.
            By bringing together reliable research on cost of living, healthcare, taxes, residency options,
            housing, climate, safety, transportation, and quality of life, Next Horizon is designed
            to put you in the best position to make one of the most important decisions of your life.
          </p>

          <h2>Why I Created This Website</h2>

          <p>For as long as I can remember, I&apos;ve dreamed of living abroad.</p>

          <p>
            The idea of experiencing different cultures, learning how people live, discovering new places, and
            embracing the adventure of exploring the world has always inspired me. As retirement moved from
            being a distant idea to something I was actively planning, that dream became much more personal.
          </p>

          <p>I started asking the same questions you may be asking today.</p>

          <p className={styles.questionLine}>Where could I afford to retire?</p>
          <p className={styles.questionLine}>What countries have excellent healthcare?</p>
          <p className={styles.questionLine}>How do taxes work?</p>
          <p className={styles.questionLine}>Could I really live in Europe? Or would another destination be a better fit?</p>

          <p>
            The deeper I researched, the more I realized how difficult it was to find practical, trustworthy
            information in one place. Every answer seemed to lead to five more questions, and important
            details were scattered across government websites, financial articles, expat forums, and travel
            blogs.
          </p>

          <p>So I began organizing everything.</p>

          <p>
            What started as my own research gradually grew into a structured knowledge base, and eventually
            became Next Horizon.
          </p>

          <h2>My Approach</h2>

          <p>
            I&apos;m naturally curious. When something matters to me, I don&apos;t stop after finding one
            answer. I enjoy exploring a topic from multiple perspectives, comparing sources, questioning
            assumptions, and continuing to learn until I have a well-rounded understanding.
          </p>

          <p>That curiosity has shaped every part of this project.</p>

          <p>
            Rather than promoting a particular country or trying to convince you that one destination is
            &quot;the best,&quot; I focus on presenting balanced information that allows you to compare your
            options based on what matters most to you.
          </p>

          <p>No retirement destination is perfect.</p>

          <p>
            Every country and every U.S. state involves trade-offs. My goal is to help you understand those
            trade-offs so you can make confident, informed decisions for your own situation.
          </p>

          <h2>About Me</h2>

          <p className={styles.nameLine}>My name is Laura Scates, BSN, RN, CRNI.</p>

          <p>
            For more than a decade, I&apos;ve worked as a registered nurse, helping patients understand
            complex information, navigate unfamiliar healthcare systems, and make informed decisions about
            their care.
          </p>

          <p>
            Those same skills have proven invaluable while researching retirement. Whether comparing
            healthcare systems, understanding tax implications, evaluating residency pathways, or organizing
            large amounts of information, I approach this work with the same commitment to accuracy,
            curiosity, and thoughtful analysis that has guided my nursing career.
          </p>

          <div className={styles.pullQuote}>
            <p>Trust, but always verify.</p>
            <p className={styles.pullQuoteSub}>
              Every figure, tax rule, and visa requirement on this site is researched and sourced — but tax
              law, visa rules, and healthcare policy change, sometimes quickly. Guides on this site label what&apos;s
              settled and what&apos;s genuinely contested or unclear, with sources cited throughout so you can
              check them yourself.
            </p>
          </div>

          <p>
            While I&apos;m not a financial advisor, attorney, tax professional, or immigration consultant, I
            believe that clear, well-organized information empowers people to ask better questions and make
            better decisions. Whenever possible, I encourage readers to verify important details with official
            government sources and qualified professionals before making major financial, legal, or healthcare
            decisions.
          </p>

          <h2>My Mission</h2>

          <p>Retirement is more than a financial milestone.</p>

          <p>
            It&apos;s an opportunity to create the life you&apos;ve imagined — whether that means retiring
            abroad, relocating within the United States, embracing slow travel, or simply finding a place that
            feels like home.
          </p>

          <p>
            My hope is that Next Horizon saves you time, reduces uncertainty, and gives you the
            confidence to explore your options with clarity.
          </p>

          <p>
            If this website helps you find the place where your next chapter begins, then every hour spent
            building it will have been worthwhile.
          </p>

          <p className={styles.closing}>
            Welcome to Next Horizon, and thank you for allowing me to be part of your journey.
          </p>
        </article>

        <div className={styles.ctaRow}>
          <Link href="/match" className={styles.ctaPrimary}>Find Your Fit →</Link>
          <Link href="/destinations" className={styles.ctaSecondary}>Browse All Destinations →</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
