import { createHash } from 'crypto';

/**
 * Turns a raw IP into a one-way, non-reversible hash so we never store the
 * visitor's actual IP address anywhere (rate-limit keys or logs). Requires
 * IP_HASH_SALT so hashes aren't guessable/rainbow-tableable from a bare
 * SHA-256 of common IPs. Generate a random 32+ char string once and keep it
 * stable across deploys (rotating it just resets everyone's rate limits).
 */
export function hashIp(rawIp) {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    throw new Error(
      'IP_HASH_SALT is not set. Add a random secret string to your Vercel env vars before deploying.'
    );
  }
  return createHash('sha256').update(`${salt}:${rawIp}`).digest('hex');
}

/**
 * Best-effort visitor IP extraction behind Vercel's proxy layer. Works with
 * both the Headers object from next/headers (Server Components) and
 * NextRequest.headers (Route Handlers), since both expose .get().
 */
export function getClientIp(headersList) {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
