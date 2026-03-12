<script lang="ts">
    type State = "idle" | "loading" | "done" | "error";
    let state = $state<State>("idle");

    async function share() {
        if (state === "loading") return;
        state = "loading";

        try {
            const res = await fetch("/api/og.png");
            if (!res.ok) throw new Error("Failed to fetch image");

            const blob = await res.blob();
            const file = new File([blob], "owcs-rankings.png", {
                type: "image/png",
            });

            // Try native share sheet first (works great on mobile)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: "OWCS Team Global Rankings",
                    text: "Current OWCS ELO-based power rankings — owcsnexus.xyz",
                });
                state = "done";
            } else {
                // Fallback: trigger download
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "owcs-rankings.png";
                a.click();
                URL.revokeObjectURL(url);
                state = "done";
            }
        } catch (e: any) {
            // User cancelled the share sheet — not a real error
            if (e?.name === "AbortError") {
                state = "idle";
                return;
            }
            console.error("[ShareButton]", e);
            state = "error";
        }

        // Reset after 2.5s
        setTimeout(() => (state = "idle"), 2500);
    }
</script>

<button
    onclick={share}
    disabled={state === "loading"}
    class="flex items-center gap-2 px-3 py-1 border border-neutral-800 rounded-full
    bg-neutral-900/80 backdrop-blur-sm font-mono text-xs uppercase tracking-widest
    transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
    {state === 'done'
        ? 'text-emerald-400 border-emerald-800'
        : state === 'error'
          ? 'text-red-400 border-red-800'
          : 'text-neutral-400 hover:text-white hover:border-neutral-600'}"
>
    {#if state === "loading"}
        <!-- Spinner -->
        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
                class="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="3"
            />
            <path
                class="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
        </svg>
        <span>Generating...</span>
    {:else if state === "done"}
        <!-- Checkmark -->
        <svg
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 13l4 4L19 7"
            />
        </svg>
        <span>Saved!</span>
    {:else if state === "error"}
        <!-- X -->
        <svg
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
        <span>Failed</span>
    {:else}
        <!-- Share icon -->
        <svg
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
        </svg>
        <span>Share Rankings</span>
    {/if}
</button>
