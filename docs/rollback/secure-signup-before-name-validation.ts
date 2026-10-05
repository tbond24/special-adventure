import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

async function sha1Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) return json({ error: "missing_fields" }, 400);
    if (typeof password !== "string" || password.length < 12) {
      return json({ error: "weak_password", message: "Use at least 12 characters." }, 400);
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return json({ error: "weak_password", message: "Use upper and lowercase letters plus a number." }, 400);
    }

    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const hibp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Vacancy/0.1" },
    });
    if (!hibp.ok) return json({ error: "password_check_unavailable", message: "Password safety check is temporarily unavailable. Please retry." }, 503);
    const leaked = (await hibp.text()).split(/\r?\n/).some(line => line.split(":")[0] === suffix);
    if (leaked) return json({ error: "leaked_password", message: "That password appears in known breach data. Choose a different password." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const signup = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: { display_name: name } }),
    });
    const data = await signup.json();
    return json(data, signup.status);
  } catch {
    return json({ error: "signup_failed" }, 500);
  }
});
