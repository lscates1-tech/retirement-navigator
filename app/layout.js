import './globals.css';

export const metadata = {
  title: 'Next Horizon — Decide where, and how, to live',
  description:
    'Real tax, visa, healthcare, and cost data for retiring abroad, working remotely, slow travel, tax-residency rotation, or a strategic U.S. home base — for thoughtful adults planning their next chapter.',
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
