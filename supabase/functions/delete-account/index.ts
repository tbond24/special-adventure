import { createClient } from "npm:@supabase/supabase-js@2.115.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(url, publishable, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user) return json({ error: "unauthorized" }, 401);
  // Fail before irreversible Storage/Auth deletion until retryable cleanup and
  // moderation-audit retention have an approved, tested end-to-end contract.
  return json({ error: "account_deletion_temporarily_unavailable", message: "Account deletion is temporarily unavailable. No data was removed." }, 503);
});
