import { createClient } from "npm:@supabase/supabase-js@2.115.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(url, publishable, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user) return json({ error: "unauthorized" }, 401);
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: media, error: mediaError } = await admin.from("media").select("storage_path").eq("owner_id", user.id);
  if (mediaError) return json({ error: "media_lookup_failed" }, 500);
  const paths=(media || []).map(item => item.storage_path).filter(Boolean);
  if (paths.length) { const { error: storageError }=await admin.storage.from("room-media").remove(paths); if(storageError)return json({error:"media_delete_failed"},500); }
  const { error: deleteError }=await admin.auth.admin.deleteUser(user.id);
  if(deleteError)return json({error:"account_delete_failed"},500);
  return json({deleted:true});
});
