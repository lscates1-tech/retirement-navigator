'use client';

import { useEffect, useState } from 'react';
import styles from './ShareButtons.module.css';

/**
 * Share links for articles. Every platform uses a plain share URL (no
 * third-party SDKs or tracking scripts), so nothing extra loads until a
 * reader actually clicks.
 *
 * Instagram and TikTok have no web share URL; on phones they're reached
 * through the native share button, which opens the device's share sheet.
 */
export default function ShareButtons({ url, title, image }) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // navigator.share only exists in the browser, so detect it after mount
  // to keep the server and client HTML identical.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links = [
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    {
      name: 'Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${
        image ? `&media=${encodeURIComponent(image)}` : ''
      }`,
    },
    { name: 'X / Twitter', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
  ];

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // Reader closed the share sheet; nothing to do.
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: fall back to a temporary text field.
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'absolute';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(field);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.wrap}>
      {canNativeShare && (
        <button type="button" onClick={handleNativeShare} className={styles.nativeButton}>
          Share…
        </button>
      )}
      <div className={styles.grid}>
        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`Share on ${l.name} (opens in a new tab)`}
          >
            {l.name}
          </a>
        ))}
        <a
          href={`mailto:?subject=${t}&body=${u}`}
          className={styles.link}
          aria-label="Share by email"
        >
          Email
        </a>
        <button type="button" onClick={handleCopy} className={styles.link} aria-live="polite">
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
