const SUPABASE_URL = 'https://xtutkwiivqkgkqjpkxvj.supabase.co';
const PUBLIC_KEY = 'sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const fs = require('node:fs');
const path = require('node:path');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function listingSlug(room, property) {
  return [room.unit_type || room.name || 'listing', property.suburb || property.city, property.suburb && property.city !== property.suburb ? property.city : '']
    .filter(Boolean).join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '') || 'listing';
}

module.exports = async function listingPage(req, res) {
  const id = String(req.query?.id || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!UUID.test(id)) return res.status(404).end('Listing not found');

  const select = 'id,rent_amount,rent_currency,rent_period,deposit,expires_at,rooms!inner(name,unit_type,description,media(storage_path,sort_order),properties!inner(suburb,city,country))';
  const params = new URLSearchParams({select, id:`eq.${id}`, status:'eq.active', limit:'1'});
  let rows;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vacancies?${params}`, {
      headers: {apikey: PUBLIC_KEY, Authorization: `Bearer ${PUBLIC_KEY}`},
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`Public listing lookup failed: ${response.status}`);
    rows = await response.json();
  } catch (error) {
    console.error(error);
    return res.status(502).end('Listing temporarily unavailable');
  }
  const listing = rows[0];
  if (!listing || (listing.expires_at && new Date(listing.expires_at) <= new Date())) return res.status(404).end('Listing not found');

  const room = listing.rooms;
  const property = room.properties;
  const place = [...new Set([property.suburb, property.city, property.country].filter(Boolean))].join(', ');
  const title = [room.unit_type || room.name || 'Vacancy', place ? `in ${place}` : ''].filter(Boolean).join(' ');
  const description = String(room.description || '').trim().slice(0, 500);
  const amount = Number(listing.rent_amount);
  const price = Number.isFinite(amount) && amount > 0
    ? `${listing.rent_currency || 'KES'} ${amount.toLocaleString('en-US')}${listing.rent_period ? `/${listing.rent_period}` : ''}`
    : 'Price on request';
  const media = (room.media || []).filter(item => item.storage_path).sort((a,b) => a.sort_order - b.sort_order);
  const photo = media[0] ? `${SUPABASE_URL}/storage/v1/object/public/room-media/${media[0].storage_path.split('/').map(encodeURIComponent).join('/')}` : '';
  const canonical = `https://getvacancy.site/listings/${id}/${listingSlug(room, property)}`;
  const summary = `${price}${place ? ` · ${place}` : ''}${description ? ` · ${description}` : ''}`;
  const image = photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(title)}" width="1200" height="800">` : '';
  const meta = `<base href="/"><meta name="description" content="${escapeHtml(summary.slice(0,160))}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(summary.slice(0,200))}"><meta property="og:url" content="${canonical}">${photo ? `<meta property="og:image" content="${escapeHtml(photo)}">` : ''}<meta name="twitter:card" content="${photo ? 'summary_large_image' : 'summary'}">`;

  try {
    const template = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const html = template
      .replace('<head>', `<head>${meta}`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | Vacancy</title>`)
      .replace('<main id="app"></main>', `<main id="app"><article><h1>${escapeHtml(title)}</h1>${image}<p>${escapeHtml(price)}</p>${description ? `<p>${escapeHtml(description)}</p>` : ''}</article></main>`);
    return res.status(200).end(html);
  } catch (error) {
    console.error(error);
    return res.status(502).end('Listing temporarily unavailable');
  }
};
