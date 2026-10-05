import { Webhook } from "npm:standardwebhooks@1.0.0";
import { createHandler } from "./handler.mjs";

const secret = Deno.env.get("VACANCY_AUTH_HOOK_SECRET") || "";
const handler = createHandler({
  verify: (body, headers) => {
    if (!secret) throw new Error("Missing hook secret");
    return new Webhook(secret.replace(/^v1,whsec_/, "")).verify(body, headers);
  },
  apiKey: Deno.env.get("VACANCY_AUTH_RESEND_KEY"),
  supabaseUrl: Deno.env.get("SUPABASE_URL"),
});
Deno.serve(handler);
