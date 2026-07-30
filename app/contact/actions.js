'use server';

import { redirect } from 'next/navigation';
import { sendContactMessage } from '@/lib/email';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Handles the /contact form. Deliberately redirects back to the same
 * GET-based page with a query param carrying the result, matching the
 * zero-client-JS pattern used by the /recommend lead form — no client
 * state, no JSON response, just a server action + redirect.
 */
export async function submitContact(formData) {
  const name = (formData.get('name') || '').toString().trim();
  const email = (formData.get('email') || '').toString().trim();
  const message = (formData.get('message') || '').toString().trim();

  if (!isValidEmail(email)) {
    redirect('/contact?contactError=invalid_email');
  }

  if (!message) {
    redirect('/contact?contactError=missing_message');
  }

  try {
    await sendContactMessage({ name, email, message });
  } catch (err) {
    console.error('[contact] send failed', err);
    redirect('/contact?contactError=send_failed');
  }

  redirect('/contact?contactSent=1');
}
