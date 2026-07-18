function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Takes rendered article HTML, finds every <h2>, gives it an id derived
 * from its text, and returns both the modified HTML and a flat list of
 * {title, id} entries suitable for a "jump to section" nav. Used on
 * destination and guide pages, whose content now follows a fairly
 * consistent set of H2 sections (Overview, Cost of Living, Healthcare...)
 * since the content-quality pass.
 */
export function addHeadingAnchors(html) {
  if (!html) return { html: html || '', toc: [] };

  const toc = [];
  const seen = new Set();

  const modified = html.replace(/<h2>(.*?)<\/h2>/g, (match, inner) => {
    // Strip any nested tags (e.g. an auto-linked glossary term) before
    // slugging, so the anchor is based on plain text only.
    const plainText = inner.replace(/<[^>]+>/g, '').trim();
    let slug = slugify(plainText) || 'section';

    // Guard against duplicate headings on the same page producing
    // colliding anchors.
    let uniqueSlug = slug;
    let i = 2;
    while (seen.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${i}`;
      i += 1;
    }
    seen.add(uniqueSlug);

    toc.push({ title: plainText, id: uniqueSlug });
    return `<h2 id="${uniqueSlug}">${inner}</h2>`;
  });

  return { html: modified, toc };
}
