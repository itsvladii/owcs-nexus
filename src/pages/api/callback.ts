// src/pages/auth/callback.ts
// Supabase redirects here after Discord OAuth completes.
// Exchanges the code for a session and redirects to the pickems page.
export const prerender = false;

import type { APIRoute } from "astro";
import { createServerClient } from "@supabase/ssr";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/pickems";

  if (!code) {
    return redirect("/pickems?error=no_code");
  }

  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookies.get(name)?.value;
        },
        set(name, value, options) {
          cookies.set(name, value, options);
        },
        remove(name, options) {
          cookies.delete(name, options);
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);
    return redirect("/pickems?error=auth_failed");
  }

  return redirect(next);
};
