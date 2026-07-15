'use server';

import { redirect } from 'next/navigation';
import { saveLead } from '@/lib/leads';

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

  params.set(saveFailed ? 'leadError' : 'leadSaved', saveFailed ? 'save_failed' : '1');
  redirect(`/recommend?${params.toString()}`);
}
