import { Resend } from 'resend';

let client = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    client = new Resend(apiKey);
  }
  return client;
}

function escapeHtml(value) {
  return (value || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml({ recommendation, destinations }) {
  const destList = destinations ? destinations.split(',').map((d) => d.trim()).filter(Boolean) : [];

  return `
  <div style="background:#EFEAE0;padding:32px 16px;font-family:'IBM Plex Sans',Arial,sans-serif;color:#2A2A28;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;">
      <div style="background:#2B2A52;padding:24px 28px;">
        <span style="color:#EFEAE0;font-size:20px;font-weight:600;">Next <span style="color:#CBA04D;">Horizon</span></span>
      </div>
      <div style="padding:28px;">
        <p style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#7E6025;margin:0 0 14px;">
          Your recommendation
        </p>
        <p style="font-size:18px;line-height:1.6;font-family:Georgia,'Times New Roman',serif;color:#2B2A52;margin:0 0 24px;">
          ${escapeHtml(recommendation)}
        </p>
        ${
          destList.length
            ? `<p style="font-size:14px;color:#5D5A51;margin:0 0 24px;">Weighed against: ${escapeHtml(destList.join(', '))}</p>`
            : ''
        }
        <a href="https://nexthorizon.life/destinations" style="display:inline-block;background:#2B2A52;color:#EFEAE0;padding:12px 20px;border-radius:4px;text-decoration:none;font-size:15px;font-weight:600;">
          Browse all destinations
        </a>
      </div>
      <div style="padding:18px 28px;background:#EFEAE0;font-size:12px;color:#5D5A51;">
        Next Horizon — not a licensed tax or financial advisor.
      </div>
    </div>
  </div>`;
}

/**
 * Sends the visitor their recommendation by email. Best-effort: returns
 * quietly (does not throw) if RESEND_API_KEY isn't configured yet, so the
 * lead-capture flow keeps working (saving to Notion) even before email
 * sending is set up. Throws only on an actual send failure once configured,
 * so the caller can log it without blocking the "saved" confirmation.
 */
export async function sendRecommendationEmail({ to, recommendation, destinations }) {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured — skipping send.');
    return { sent: false };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Next Horizon <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: 'Your Next Horizon destination recommendation',
    html: buildHtml({ recommendation, destinations }),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message || JSON.stringify(error)}`);
  }

  return { sent: true };
}
