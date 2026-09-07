const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const json = (message: string, status: number) => new Response(JSON.stringify({ message }), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json('Method not allowed.', 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: req.headers.get('Authorization') || '', 'Content-Type': 'application/json' };
  try {
    const user = await fetch(`${url}/auth/v1/user`, { headers: auth, signal: AbortSignal.timeout(10000) });
    if (!user.ok) return json('This reset link is invalid or expired. Request a new link.', 401);
    const { password } = await req.json();
    if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return json('Use 12–128 characters with upper and lowercase letters and a number.', 400);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const breach = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(10000) });
    if (!breach.ok) return json('Password safety check is unavailable. Please retry.', 503);
    const lines = (await breach.text()).trim().split(/\r?\n/);
    if (!lines.length || lines.some(line => !/^[0-9A-F]{35}:\d+$/.test(line))) return json('Password safety check is unavailable. Please retry.', 503);
    if (lines.some(line => line.split(':')[0] === hash.slice(5) && Number(line.split(':')[1]) > 0)) return json('That password appears in known breach data. Choose a different password.', 400);
    // Caller JWT, never service-role authority, performs the actual password change.
    const update = await fetch(`${url}/auth/v1/user`, { method: 'PUT', headers: auth, body: JSON.stringify({ password }), signal: AbortSignal.timeout(10000) });
    if (!update.ok) return json(update.status === 429 ? 'Too many attempts. Please wait.' : 'Password could not be updated. Request a new link or retry.', update.status);
    await fetch(`${url}/auth/v1/logout?scope=global`, { method: 'POST', headers: auth, signal: AbortSignal.timeout(10000) });
    return json('Password updated.', 200);
  } catch { return json('Password safety check or connection is unavailable. Please retry.', 503); }
});
