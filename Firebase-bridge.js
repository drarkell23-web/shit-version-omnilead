// Optional bridge: if you later add Firebase client config, set firebaseConfig here.
// This file always POSTs to your server endpoints for leads/contractors/reviews.
export async function createLead(lead) {
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    return await res.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}

export async function upsertContractor(contractor) {
  try {
    const res = await fetch('/api/contractor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractor)
    });
    return await res.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}

export async function uploadReview(formData) {
  try {
    const res = await fetch('/api/review', { method: 'POST', body: formData });
    return await res.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}
