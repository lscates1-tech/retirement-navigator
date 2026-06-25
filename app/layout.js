import './globals.css';

export const metadata = {
  title: 'Retirement Navigator — Compare countries and states for retirement',
  description:
    'Compare real tax thresholds, visa rules, healthcare costs, and monthly budgets across countries and U.S. states before you decide where to retire.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
