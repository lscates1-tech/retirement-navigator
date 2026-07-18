import './globals.css';

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
      </body>
    </html>
  );
}
