<script lang="ts">
    // Handles Discord login and logout client-side.
    // Login triggers Supabase OAuth redirect, logout clears the session.

    export let user: {
        id: string;
        username: string;
        avatar: string | null;
    } | null = null;

    async function login() {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        );
        await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/pickems`,
            },
        });
    }

    async function logout() {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        );
        await supabase.auth.signOut();
        window.location.reload();
    }
</script>

{#if user}
    <div class="flex items-center gap-3">
        {#if user.avatar}
            <img
                src={user.avatar}
                alt={user.username}
                class="w-8 h-8 rounded-full border border-neutral-700"
            />
        {/if}
        <span
            class="font-title uppercase text-sm text-neutral-300 tracking-wide"
        >
            {user.username}
        </span>
        <button
            on:click={logout}
            class="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-600
        text-neutral-500 hover:text-neutral-300 font-mono text-[10px] uppercase tracking-widest
        rounded-lg transition-all"
        >
            Sign out
        </button>
    </div>
{:else}
    <button
        on:click={login}
        class="flex items-center gap-2.5 px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4]
      text-white font-mono text-xs uppercase tracking-widest rounded-xl transition-all"
    >
        <!-- Discord logo -->
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
            />
        </svg>
        Login with Discord
    </button>
{/if}
