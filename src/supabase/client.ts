import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabasePublishableKey);

const fallbackSupabaseUrl = "https://missing-project.supabase.co";
const fallbackSupabaseKey = "missing-supabase-publishable-key";

export const supabase = createClient(
  supabaseUrl ?? fallbackSupabaseUrl,
  supabasePublishableKey ?? fallbackSupabaseKey
);
