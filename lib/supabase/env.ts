/**
 * Supabase connection settings.
 *
 * Environment variables win when set (see .env.example). Otherwise the app
 * falls back to the hosted `salesforce-clone` project so a fresh Vercel deploy
 * works without any configuration. Both values are public by design: the
 * publishable key is shipped to every browser, and data is protected by RLS.
 */
const DEFAULT_URL = "https://oehdupiucobwizcymbbk.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_HabVI59IQyhuTTTFih3ecQ_IhlrbYcb";

export function supabaseEnv() {
  // Accept the new publishable key or the legacy anon key
  // (the Vercel ↔ Supabase integration sets NEXT_PUBLIC_SUPABASE_ANON_KEY).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_PUBLISHABLE_KEY;
  return { url, key };
}
