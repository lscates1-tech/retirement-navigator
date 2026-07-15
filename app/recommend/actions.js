'use server';

import { redirect } from 'next/navigation';
import { saveLead } from '@/lib/leads';
import { sendRecommendationEmail } from '@/lib/email';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Handles the optional "save my match" form on the /recommend results page.
 * Deliberately redirects back to the same GET-based results URL (carrying
 * the original answers as query params) rather than returning JSON, so the
 * whole flow stays consistent with the rest of the site's zero-client-JS,
 * URL-driven pattern.
 */
export async function submitLead(formData) {
  const email = (formData.get('email') || '').toString().trim();
  const climate = (formData.get('climate') || '').toString();
  const budget = (formData.get('budget') || '').toString();
  const visaPriority = (formData.get('visaPriority') || '').toString();
  const notes = (formData.get('notes') || '').toString();
  const recommendation = (formData.get('recommendation') || '').toString();
  const destinations = (formData.get('destinations') || '').toString();

  const params = new URLSearchParams({ climate, budget, visaPriority, notes });

  if (!isValidEmail(email)) {
    params.set('leadError', 'invalid_email');
    redirect(`/recommend?${params.toString()}`);
  }

  let saveFailed = false;
  try {
    await saveLead({ email, climate, budget, visaPriority, notes, recommendation, destinations });
  } catch (err) {
    console.error('[recommend] lead save failed', err);
    saveFailed = true;
  }

  // Email is best-effort and deliberately doesn't affect the redirect
  // outcome — the Notion save above is the source of truth for "did we
  // capture this lead", so a Resend hiccup (e.g. not configured yet)
  // shouldn't turn a successful save into an error message.
  if (!saveFailed) {
    try {
      await sendRecommendationEmail({ to: email, recommendation, destinations });
    } catch (err) {
      console.error('[recommend] email send failed', err);
    }
  }

  params.set(saveFailed ? 'leadError' : 'leadSaved', saveFailed ? 'save_failed' : '1');
  redirect(`/recommend?${params.toString()}`);
}
