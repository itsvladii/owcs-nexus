import { createClient } from "@supabase/supabase-js";

// import.meta.env works in both SSR (Astro) and the browser.
// process.env only works in Node — never use it in client-side components.
// Variables must be prefixed PUBLIC_ to be exposed to the browser by Astro/Vite.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. Make sure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set in your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
