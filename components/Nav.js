import Link from 'next/link';

export default function Nav() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 36px',
        backgroundColor: 'var(--ink)',
      }}
    >
      <Link href="/" className="display" style={{ color: 'var(--linen)', fontSize: 19, fontWeight: 600 }}>
        Retirement <span style={{ color: 'var(--brass)' }}>Navigator</span>
      </Link>
      <div style={{ display: 'flex', gap: 28, fontSize: 13, color: '#D4D2E2' }}>
        <Link href="/destinations">Destinations</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/calculator">Calculator</Link>
        <Link href="/guides">Guides</Link>
      </div>
    </div>
  );
}
