import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'Next Horizon — Decide where, and how, to live',
  description:
    'Real tax, visa, healthcare, and cost data for retiring abroad, working remotely, slow travel, tax-residency rotation, or a strategic U.S. home base — for thoughtful adults planning their next chapter.',
};

// Without this, mobile browsers assume a ~980px desktop-width page and
// shrink everything to fit — forcing visitors to pinch-zoom just to read
// normal text. This tells the browser to render at the device's actual
// width instead.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}

        {/* Travelpayouts Drive (Emerald) — site-wide monetization script.
            Loaded via next/script with afterInteractive so it runs after
            hydration and never blocks initial page render. */}
        <Script id="travelpayouts-drive" strategy="afterInteractive">
          {`
            (function () {
              var script = document.createElement("script");
              script.async = 1;
              script.setAttribute("data-cmp-ab", "2");
              script.src = 'https://emrldtp.cc/NTU3ODc4.js?t=557878';
              document.head.appendChild(script);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
