import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function DestinationDetailPage({ params }) {
  return (
    <main>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <h1 className="display" style={{ fontSize: 28, textTransform: 'capitalize' }}>
          {params.slug.replace(/-/g, ' ')}
        </h1>
        <p style={{ color: '#5C5A54', lineHeight: 1.6 }}>
          This individual destination page will pull its full profile from the
          matching Notion page (cost of living, tax system, residency path,
          healthcare, etc.) once <code>lib/notion.js</code> is connected. Not
          yet built.
        </p>
      </div>
      <Footer />
    </main>
  );
}
