// src/lib/auth.ts
// Server-side auth helpers — use in Astro page frontmatter.
// All session reading happens server-side; no tokens exposed to the client.

import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient(
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
}

/**
 * Get the current user from the server-side session.
 * Returns null if not logged in.
 */
export async function getUser(cookies: AstroCookies) {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Get the Discord profile from user metadata.
 * Supabase stores Discord avatar/username in user.user_metadata.
 */
export function getDiscordProfile(user: Awaited<ReturnType<typeof getUser>>) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    discordId: meta.provider_id ?? meta.sub ?? "",
    username:
      meta.full_name ??
      meta.name ??
      meta.custom_claims?.global_name ??
      "Anonymous",
    avatar: meta.avatar_url ?? null,
  };
}
