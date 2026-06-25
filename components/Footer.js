export default function Footer() {
  return (
    <div
      style={{
        padding: '24px 36px',
        backgroundColor: 'var(--ink)',
        color: '#A8A5C2',
        fontSize: 11.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span>&copy; {new Date().getFullYear()} Retirement Navigator — not a licensed tax or financial advisor</span>
      <span className="mono">Data verified 2026</span>
    </div>
  );
}
