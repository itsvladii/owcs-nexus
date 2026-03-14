<script lang="ts">
    // ── Prop types — matching global_stats JSONB shapes ──

    export let biggestMover: {
        name: string;
        diff: number; // float — pts gained, e.g. 144.93
        logo?: string;
        logoDark?: string;
    } | null = null;

    export let biggestLoser: {
        name: string;
        diff: number; // float — pts lost (positive number, rendered negative)
        logo?: string;
        logoDark?: string;
    } | null = null;

    export let longestReign: {
        name: string;
        days: number;
        logo?: string;
        logoDark?: string;
    } | null = null;

    export let biggestUpsets: {
        winner: string;
        loser: string;
        score: string; // e.g. "3-1"
        elo_diff: number; // rating gap at match time — how surprising the result was
        winner_logo?: string;
        loser_logo?: string;
    }[] = [];

    // Dev mode — bypasses real props, shows all 4 cards with stub data
    export let devMode: boolean = false;

    // ── Stub data ──
    const DEV_STUBS = {
        biggestMover: {
            name: "Enter Force.36",
            diff: 144.93,
            logo: undefined as string | undefined,
            logoDark: undefined as string | undefined,
        },
        biggestLoser: {
            name: "Team Falcons",
            diff: 98.4,
            logo: undefined as string | undefined,
            logoDark: undefined as string | undefined,
        },
        longestReign: {
            name: "Enter Force.36",
            days: 18,
            logo: undefined as string | undefined,
            logoDark: undefined as string | undefined,
        },
        biggestUpsets: [
            {
                winner: "Crazy Raccoon",
                loser: "Enter Force.36",
                score: "3-1",
                elo_diff: 312,
                winner_logo: undefined as string | undefined,
                loser_logo: undefined as string | undefined,
            },
            {
                winner: "Spear Gaming",
                loser: "Team Falcons",
                score: "3-0",
                elo_diff: 224,
                winner_logo: undefined as string | undefined,
                loser_logo: undefined as string | undefined,
            },
        ],
    };

    $: resolvedMover = devMode ? DEV_STUBS.biggestMover : biggestMover;
    $: resolvedLoser = devMode ? DEV_STUBS.biggestLoser : biggestLoser;
    $: resolvedReign = devMode ? DEV_STUBS.longestReign : longestReign;
    $: resolvedUpsets = devMode ? DEV_STUBS.biggestUpsets : biggestUpsets;
    $: show = !!(
        resolvedMover ||
        resolvedLoser ||
        resolvedReign ||
        resolvedUpsets?.length
    );

    // Shared logo bleed placeholder for dev mode
</script>

{#if show}
    {#if devMode}
        <div
            class="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 border border-[#FF7FDE]/30 bg-[rgba(255,127,222,0.06)]"
        >
            <span class="w-1.5 h-1.5 rounded-full bg-[#FF7FDE] animate-pulse"
            ></span>
            <span
                class="font-mono text-[9px] uppercase tracking-[0.3em] text-[#FF7FDE]/70"
            >
                Dev Preview — Stub Data
            </span>
        </div>
    {/if}

    <div class="flex flex-wrap gap-4 mb-12">
        <!-- ── BIGGEST MOVER ── Bleu Électrique -->
        {#if resolvedMover}
            <div
                class="relative flex items-stretch border border-white/5 bg-white/[0.02] overflow-hidden min-w-[280px] flex-1 max-w-sm"
            >
                <div
                    class="w-[3px] shrink-0 bg-[#085FFF] shadow-[2px_0_10px_rgba(8,95,255,0.3)]"
                ></div>

                <div class="flex flex-col gap-2 px-6 py-5 z-10 relative flex-1">
                    <span
                        class="font-mono text-[9px] uppercase tracking-[0.35em] text-[#085FFF]"
                        >Biggest Mover</span
                    >
                    <span
                        class="font-title uppercase text-white text-2xl sm:text-3xl leading-none tracking-tight"
                    >
                        {resolvedMover.name}
                    </span>
                    <div class="flex items-baseline gap-1.5 mt-1">
                        <span
                            class="font-mono font-black text-[#085FFF] text-2xl tabular-nums leading-none"
                        >
                            +{Math.round(resolvedMover.diff)}
                        </span>
                        <span
                            class="font-mono text-[10px] text-[#085FFF] opacity-60 uppercase tracking-widest"
                            >pts</span
                        >
                    </div>
                </div>

                {#if resolvedMover.logoDark || resolvedMover.logo}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none"
                        aria-hidden="true"
                    >
                        <img
                            src={resolvedMover.logoDark || resolvedMover.logo}
                            alt=""
                            class="absolute right-[-20%] top-1/2 -translate-y-1/2 w-36 h-36 object-contain"
                            style="opacity:0.12; filter:grayscale(100%) brightness(8) contrast(100%)"
                        />
                    </div>
                {:else if devMode}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none flex items-center justify-end pr-6"
                        aria-hidden="true"
                    >
                        <div
                            class="w-20 h-20 border border-dashed border-white/10 flex items-center justify-center opacity-25"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                class="w-8 h-8 text-white/40"
                            >
                                <path
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                />
                            </svg>
                        </div>
                    </div>
                {/if}

                <div
                    class="absolute inset-0 pointer-events-none"
                    style="background: radial-gradient(ellipse at 0% 50%, rgba(8,95,255,0.06) 0%, transparent 60%)"
                ></div>
            </div>
        {/if}

        <!-- ── LONGEST REIGN ── Rose Lumineux -->
        {#if resolvedReign}
            <div
                class="relative flex items-stretch border border-white/5 bg-white/[0.02] overflow-hidden min-w-[280px] flex-1 max-w-sm"
            >
                <div
                    class="w-[3px] shrink-0 bg-[#FF7FDE] shadow-[2px_0_10px_rgba(255,127,222,0.25)]"
                ></div>

                <div class="flex flex-col gap-2 px-6 py-5 z-10 relative flex-1">
                    <span
                        class="font-mono text-[9px] uppercase tracking-[0.35em] text-[#FF7FDE]"
                        >Longest Reign</span
                    >
                    <span
                        class="font-title uppercase text-white text-2xl sm:text-3xl leading-none tracking-tight"
                    >
                        {resolvedReign.name}
                    </span>
                    <div class="flex items-baseline gap-1.5 mt-1">
                        <span
                            class="font-mono font-black text-[#FF7FDE] text-2xl tabular-nums leading-none"
                        >
                            {resolvedReign.days}
                        </span>
                        <span
                            class="font-mono text-[10px] text-[#FF7FDE] opacity-60 uppercase tracking-widest"
                            >days at #1</span
                        >
                    </div>
                </div>

                {#if resolvedReign.logoDark || resolvedReign.logo}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none"
                        aria-hidden="true"
                    >
                        <img
                            src={resolvedReign.logoDark || resolvedReign.logo}
                            alt=""
                            class="absolute right-[-20%] top-1/2 -translate-y-1/2 w-36 h-36 object-contain"
                            style="opacity:0.12; filter:grayscale(100%) brightness(8) contrast(100%)"
                        />
                    </div>
                {:else if devMode}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none flex items-center justify-end pr-6"
                        aria-hidden="true"
                    >
                        <div
                            class="w-20 h-20 border border-dashed border-white/10 flex items-center justify-center opacity-25"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                class="w-8 h-8 text-white/40"
                            >
                                <path
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                />
                            </svg>
                        </div>
                    </div>
                {/if}

                <div
                    class="absolute inset-0 pointer-events-none"
                    style="background: radial-gradient(ellipse at 0% 50%, rgba(255,127,222,0.05) 0%, transparent 60%)"
                ></div>
            </div>
        {/if}

        <!-- ── BIGGEST UPSETS ── neutral white, up to 2 -->
        {#each (resolvedUpsets ?? []).slice(0, 2) as upset, i}
            <div
                class="relative flex items-stretch border border-white/5 bg-white/[0.02] overflow-hidden min-w-[280px] flex-1 max-w-sm"
            >
                <div class="w-[3px] shrink-0 bg-white/15"></div>

                <div
                    class="flex flex-col gap-2 px-6 py-5 z-10 relative flex-1 min-w-0"
                >
                    <span
                        class="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30"
                    >
                        Biggest Upset{resolvedUpsets.length > 1
                            ? ` #${i + 1}`
                            : ""}
                    </span>

                    <!-- Winner — the underdog -->
                    <span
                        class="font-title uppercase text-white text-2xl sm:text-3xl leading-none tracking-tight truncate"
                    >
                        {upset.winner}
                    </span>

                    <!-- Loser row: def. + name + score -->
                    <div class="flex items-center gap-2 min-w-0">
                        <span
                            class="font-mono text-[9px] text-white/20 uppercase tracking-widest shrink-0"
                            >def.</span
                        >
                        <span
                            class="font-title uppercase text-white/35 text-sm leading-none truncate"
                        >
                            {upset.loser}
                        </span>
                        <span
                            class="font-mono text-white/20 text-xs tabular-nums shrink-0 ml-auto pl-2"
                        >
                            {upset.score}
                        </span>
                    </div>

                    <!-- Rating gap — the "how surprising" number -->
                    <div class="flex items-baseline gap-1.5 mt-1">
                        <span
                            class="font-mono font-black text-white/60 text-2xl tabular-nums leading-none"
                        >
                            +{upset.elo_diff}
                        </span>
                        <span
                            class="font-mono text-[10px] text-white/20 uppercase tracking-widest"
                            >rating gap</span
                        >
                    </div>
                </div>

                {#if upset.winner_logo}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none"
                        aria-hidden="true"
                    >
                        <img
                            src={upset.winner_logo}
                            alt=""
                            class="absolute right-[-20%] top-1/2 -translate-y-1/2 w-36 h-36 object-contain"
                            style="opacity:0.10; filter:grayscale(100%) brightness(8) contrast(100%)"
                        />
                    </div>
                {:else if devMode}
                    <div
                        class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none flex items-center justify-end pr-6"
                        aria-hidden="true"
                    >
                        <div
                            class="w-20 h-20 border border-dashed border-white/10 flex items-center justify-center opacity-25"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                class="w-8 h-8 text-white/40"
                            >
                                <path
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                />
                            </svg>
                        </div>
                    </div>
                {/if}

                <div
                    class="absolute inset-0 pointer-events-none"
                    style="background: radial-gradient(ellipse at 0% 50%, rgba(255,255,255,0.015) 0%, transparent 60%)"
                ></div>
            </div>
        {/each}
    </div>
{/if}
