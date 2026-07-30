import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { submitContact } from './actions';
import styles from './contact.module.css';

export const metadata = {
  title: 'Contact — Next Horizon',
  description: 'Questions, corrections, or partnership inquiries — get in touch with Next Horizon.',
};

export default function ContactPage({ searchParams }) {
  const sent = searchParams?.contactSent === '1';
  const error = searchParams?.contactError;

  return (
    <main id="main-content">
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Contact</h1>
          <p className={styles.heroLede}>
            Questions about a destination, a correction to something on the site, or a partnership
            inquiry — send a message and we&apos;ll get back to you.
          </p>
        </div>
      </div>

      <div className={styles.wrap}>
        {sent ? (
          <div className={styles.thanksBox}>
            <p className={styles.thanksTitle}>Message sent — thank you.</p>
            <p className={styles.thanksSub}>We&apos;ll get back to you as soon as we can.</p>
          </div>
        ) : (
          <form action={submitContact} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className={styles.input}
                placeholder="Your name"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                className={styles.textarea}
                placeholder="What's on your mind?"
              />
            </div>

            <button type="submit" className={styles.submit}>Send Message</button>

            {error === 'invalid_email' && (
              <p className={styles.errorText}>That doesn&apos;t look like a valid email — mind trying again?</p>
            )}
            {error === 'missing_message' && (
              <p className={styles.errorText}>Looks like the message is empty — mind adding a bit more?</p>
            )}
            {error === 'send_failed' && (
              <p className={styles.errorText}>
                Something went wrong sending that — mind trying again, or emailing{' '}
                <a href="mailto:hello@nexthorizon.life">hello@nexthorizon.life</a> directly?
              </p>
            )}
          </form>
        )}
      </div>

      <Footer />
    </main>
  );
}
