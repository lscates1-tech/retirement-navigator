import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function DestinationsPage() {
  return (
    <main>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 className="display" style={{ fontSize: 28 }}>Destinations</h1>
        <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
          This page will list all 8 countries and 12 U.S. states, pulled live from
          the Notion Countries and US States databases via lib/notion.js.
          Not yet built — see the project README for what's next.
        </p>
      </div>
      <Footer />
    </main>
  );
}
