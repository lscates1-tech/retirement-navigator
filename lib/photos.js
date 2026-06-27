/**
 * Fetches a real destination photo from Unsplash.
 *
 * Setup (free):
 *   1. Create an app at https://unsplash.com/oauth/applications
 *   2. Copy the "Access Key"
 *   3. Add it to .env.local as UNSPLASH_ACCESS_KEY=your_key_here
 *
 * Until a key is configured, this returns null and the UI falls back
 * to a labeled placeholder block instead of a broken image.
 *
 * Pexels (https://www.pexels.com/api/) is a solid alternative with a
 * very similar fetch shape if you prefer it or want a second source.
 */
export async function getDestinationPhoto(query) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;

  try {
        const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
                          query
                        )}&per_page=8&orientation=landscape`,
          {
                    headers: { Authorization: `Client-ID ${key}` },
                    next: { revalidate: 86400 },
          }
              );

      if (!res.ok) return null;

      const data = await res.json();
        const results = data?.results || [];
        if (results.length === 0) return null;

      const photo = results.reduce((best, current) =>
              (current.likes || 0) > (best.likes || 0) ? current : best
                                       );

      return {
              url: photo.urls.regular,
              alt: photo.alt_description || query,
              credit: photo.user?.name || 'Unsplash',
              creditUrl: photo.user?.links?.html || 'https://unsplash.com',
      };
  } catch (err) {
        console.error('Unsplash fetch failed:', err);
        return null;
  }
}

/**
 * Fetches one specific, hand-picked Unsplash photo by its ID.
 *
 * Use this instead of getDestinationPhoto() when search results for a
 * place keep returning unrecognizable or poorly-cropped images. Find a
 * good photo on unsplash.com, grab the ID from its URL
 * (unsplash.com/photos/some-title-XXXXXXXXXX -> XXXXXXXXXX), and pass
 * it here for a fully deterministic result — no more guessing.
 */
export async function getPhotoById(id) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;

  try {
        const res = await fetch(`https://api.unsplash.com/photos/${id}`, {
                headers: { Authorization: `Client-ID ${key}` },
                next: { revalidate: 86400 },
        });

      if (!res.ok) return null;

      const photo = await res.json();

      return {
              url: photo.urls.regular,
              alt: photo.alt_description || 'Destination photo',
              credit: photo.user?.name || 'Unsplash',
              creditUrl: photo.user?.links?.html || 'https://unsplash.com',
      };
  } catch (err) {
        console.error('Unsplash fetch failed:', err);
        return null;
  }
}
