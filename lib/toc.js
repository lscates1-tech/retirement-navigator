function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Splits rendered article HTML into native <details>/<summary> sections,
 * one per H2 heading, and returns both the restructured HTML and a flat
 * {title, id} list for a "jump to section" nav.
 *
 * The anchor id is placed on the section's content wrapper (not the
 * <details> element itself, and not the <summary>) specifically so that
 * browsers' native "auto-open a closed <details> when fragment navigation
 * targets something inside it" behavior kicks in — the id needs to sit on
 * a descendant that's actually hidden when collapsed. The <summary> is
 * always visible even when closed, so an id there wouldn't trigger it.
 *
 * @param {string} html - rendered article HTML (already has plain <h2> tags)
 * @param {number} openFirstN - how many sections, in document order, start expanded
 */
export function buildSectionedArticle(html, { openFirstN = 2 } = {}) {
  if (!html) return { html: html || '', toc: [] };

  const h2Regex = /<h2>(.*?)<\/h2>/g;
  const matches = [...html.matchAll(h2Regex)];

  if (matches.length === 0) {
    return { html, toc: [] };
  }

  const toc = [];
  const seen = new Set();
  let result = html.slice(0, matches[0].index);

  matches.forEach((match, i) => {
    const [fullH2Tag, innerHtml] = match;
    const plainText = innerHtml.replace(/<[^>]+>/g, '').trim();
    let slug = slugify(plainText) || 'section';

    let uniqueSlug = slug;
    let n = 2;
    while (seen.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${n}`;
      n += 1;
    }
    seen.add(uniqueSlug);
    toc.push({ title: plainText, id: uniqueSlug });

    const sectionStart = match.index + fullH2Tag.length;
    const sectionEnd = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const sectionBody = html.slice(sectionStart, sectionEnd);

    const openAttr = i < openFirstN ? ' open' : '';
    result += `<details${openAttr}><summary>${fullH2Tag}</summary><div id="${uniqueSlug}" class="section-body">${sectionBody}</div></details>`;
  });

  return { html: result, toc };
}
