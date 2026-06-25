import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function ComparePage() {
  return (
    <main>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 className="display" style={{ fontSize: 28 }}>Compare</h1>
        <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
          This will become the real two-way destination comparator (the chat
          prototype we built earlier), wired to live Notion data. Not yet built.
        </p>
      </div>
      <Footer />
    </main>
  );
}
