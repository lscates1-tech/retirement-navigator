import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        padding: '24px 36px',
        backgroundColor: 'var(--ink)',
        color: '#A8A5C2',
        fontSize: 13,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span>&copy; {new Date().getFullYear()} Next Horizon — not a licensed tax or financial advisor</span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/about" style={{ color: '#A8A5C2', textDecoration: 'none' }}>About</Link>
        <span className="mono">Data verified 2026</span>
      </div>
    </footer>
  );
}
