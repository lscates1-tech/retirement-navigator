import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function GuidesPage() {
  return (
    <main>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 className="display" style={{ fontSize: 28 }}>Guides</h1>
        <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
          This will surface the Slow Travel and Tax-Residency Rotation content
          from Notion. Not yet built.
        </p>
      </div>
      <Footer />
    </main>
  );
}
