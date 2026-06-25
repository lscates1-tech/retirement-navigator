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
      )}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        // Cache for a day so we're not re-fetching on every request
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const photo = data?.results?.[0];
    if (!photo) return null;

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
