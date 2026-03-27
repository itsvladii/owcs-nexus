<script lang="ts">
    import {
        Activity,
        Zap,
        Scale,
        Globe,
        ArrowUp,
        ArrowDown,
    } from "lucide-svelte";
    import { fade } from "svelte/transition";

    export let regionalAverages: {
        name: string;
        avg: number;
        trend: number;
    }[] = [];

    // LFP-aligned: Bleu Électrique as the unified region signal color
    const REGION_COLORS: Record<string, string> = {
        Korea: "#085FFF",
        "North America": "#085FFF",
        EMEA: "#085FFF",
        Pacific: "#085FFF",
        China: "#085FFF",
        Japan: "#085FFF",
    };

    const SECTIONS = [
        {
            title: "The Engine",
            icon: Scale,
            desc: "A custom ELO system where points transfer from loser to winner based on tournament context and margin of victory.",
        },
        {
            title: "Dynamic K-Factor",
            icon: Activity,
            desc: "Not all matches tell the same story. The K-Factor varies based on the context of the team playing, where they play and how they play.",
        },
        {
            title: "Region Strength",
            icon: Globe,
            desc: "Teams start with different regional baselines based on historical performance of their respective regions.",
        },
        {
            title: "Inactivity Fallback",
            icon: Zap,
            desc: "Rosters that change >3 players trigger a hard reset. Teams inactive for >90 days are removed from the leaderboard.",
        },
    ];

    let activeTab: "algorithm" | "regions" = "regions";

    $: maxWidth = regionalAverages[0]?.avg || 1200;
</script>

<aside class="w-full lg:w-80 shrink-0 space-y-8">
    <div class="sticky top-24 space-y-5">
        <!-- ── TAB SWITCHER ── sharp corners, Bleu Électrique active state -->
        <div class="flex gap-0 border border-white/8">
            <button
                type="button"
                on:click={() => (activeTab = "algorithm")}
                class="flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all border-r border-white/8
                {activeTab === 'algorithm'
                    ? 'bg-[#085FFF] text-white'
                    : 'bg-transparent text-white/25 hover:text-white/60 hover:bg-white/[0.03]'}"
            >
                Algorithm
            </button>
            <button
                type="button"
                on:click={() => (activeTab = "regions")}
                class="flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all
                {activeTab === 'regions'
                    ? 'bg-[#085FFF] text-white'
                    : 'bg-transparent text-white/25 hover:text-white/60 hover:bg-white/[0.03]'}"
            >
                Reg. Average Power
            </button>
        </div>

        <div class="min-h-[480px]">
            <!-- ── ALGORITHM TAB ── -->
            {#if activeTab === "algorithm"}
                <div in:fade={{ duration: 250 }} class="space-y-5">
                    <!-- Section heading -->
                    <div class="space-y-1">
                        <h3
                            class="font-title font-black text-2xl uppercase text-white leading-tight"
                        >
                            How It Works
                        </h3>
                        <p
                            class="text-[9px] text-white/20 uppercase tracking-widest font-mono"
                        >
                            Algorithm v1.0 · 2026
                        </p>
                    </div>

                    <!-- Algorithm cards — sharp, flat, LFP block style -->
                    <div class="space-y-px">
                        {#each SECTIONS as s}
                            <div
                                class="group flex items-start gap-3 border border-white/5 bg-white/[0.01] px-4 py-4
                                hover:bg-white/[0.03] hover:border-white/10 transition-all"
                            >
                                <!-- Icon container — sharp, Bleu Électrique -->
                                <div
                                    class="mt-0.5 p-1.5 border border-[rgba(8,95,255,0.25)] bg-[rgba(8,95,255,0.08)] text-[#085FFF] shrink-0 transition-colors group-hover:border-[rgba(8,95,255,0.5)]"
                                >
                                    <svelte:component this={s.icon} size={14} />
                                </div>
                                <div class="space-y-1 min-w-0">
                                    <h4
                                        class="text-[11px] font-bold text-white uppercase tracking-wide"
                                    >
                                        {s.title}
                                    </h4>
                                    <p
                                        class="text-[11px] text-white/35 leading-relaxed"
                                    >
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    </div>

                    <!-- Doc link — sharp, blue hover -->
                    <a
                        href="/algorithm"
                        class="block w-full py-3 text-center border border-white/8
                        text-[10px] font-mono font-bold uppercase tracking-wider text-white/25
                        hover:text-[#085FFF] hover:border-[#085FFF] hover:bg-[rgba(8,95,255,0.05)] transition-all"
                    >
                        Read Full ELO Documentation
                    </a>
                </div>

                <!-- ── REGIONS TAB ── -->
            {:else}
                <div in:fade={{ duration: 250 }} class="space-y-5">
                    <!-- Section heading -->
                    <div class="space-y-1">
                        <h3
                            class="font-title font-black text-2xl uppercase text-white leading-tight"
                        >
                            Regional Average Power
                        </h3>
                        <p
                            class="text-[9px] text-white/20 uppercase tracking-widest font-mono"
                        >
                            Real-Time Regional Strength
                        </p>
                    </div>

                    <!-- Region bars -->
                    <div class="space-y-5">
                        {#each regionalAverages as reg, idx (reg.name)}
                            <!-- Opacity scales from 1.0 (rank 1) down to 0.35 (rank 6) -->
                            {@const rankOpacity =
                                1 -
                                (idx / (regionalAverages.length - 1)) * 0.65}
                            <div class="group space-y-2">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-[10px] font-mono uppercase tracking-widest"
                                            style="color: rgba(255,255,255,{0.2 +
                                                rankOpacity * 0.35})"
                                        >
                                            {idx + 1}. {reg.name}
                                        </span>
                                        {#if reg.trend !== 0}
                                            <span
                                                class="text-[8px] font-mono font-bold
                                                {reg.trend > 0
                                                    ? 'text-[#0CD905]'
                                                    : 'text-[#D90000]'}"
                                            >
                                                {reg.trend > 0
                                                    ? "▲"
                                                    : "▼"}{Math.abs(reg.trend)}
                                            </span>
                                        {/if}
                                    </div>
                                    <!-- Number fades with rank too -->
                                    <span
                                        class="text-sm font-mono font-black"
                                        style="color: rgba(8,95,255,{rankOpacity})"
                                    >
                                        {reg.avg}
                                    </span>
                                </div>

                                <!-- Bar — width + opacity both encode rank -->
                                <div
                                    class="w-full bg-white/[0.04] h-[3px] overflow-hidden"
                                >
                                    <div
                                        class="h-full transition-all duration-1000 ease-out"
                                        style="width: {(reg.avg / maxWidth) *
                                            100}%;
                                               background: linear-gradient(90deg, rgba(8,95,255,{rankOpacity *
                                            0.4}) 0%, rgba(8,95,255,{rankOpacity}) 100%)"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    </div>

                    <!-- Footnote -->
                    <p
                        class="text-[9px] font-mono text-white/15 uppercase leading-relaxed pt-3 italic"
                    >
                        * Based on mean rating of top 3 active rosters per
                        region.
                    </p>

                    <!-- Legend section -->
                    <div class="pt-4 border-t border-white/5 space-y-5">
                        <span
                            class="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]"
                        >
                            Legend & Status
                        </span>

                        <!-- Rank climb legend -->
                        <div class="space-y-2">
                            <span
                                class="text-[9px] font-mono text-white/20 uppercase tracking-widest block"
                            >
                                Rank Climb (7D)
                            </span>
                            <div class="flex items-center gap-6">
                                <div
                                    class="flex items-center gap-1.5 text-[#0CD905] font-bold text-[10px] font-mono"
                                >
                                    <ArrowUp size={13} />
                                    <span>Climb</span>
                                </div>
                                <div
                                    class="flex items-center gap-1.5 text-[#D90000] font-bold text-[10px] font-mono"
                                >
                                    <ArrowDown size={13} />
                                    <span>Drop</span>
                                </div>
                            </div>
                        </div>

                        <!-- Calibration + Partner status -->
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1.5">
                                <span
                                    class="text-[9px] font-mono text-white/20 uppercase tracking-widest block"
                                >
                                    Calibration
                                </span>
                                <div class="flex items-center gap-2">
                                    <!-- Dot matches RankTable calibration dot exactly -->
                                    <span
                                        class="w-1.5 h-1.5 rounded-full bg-[#085FFF] animate-pulse shadow-[0_0_6px_rgba(8,95,255,0.5)]"
                                    ></span>
                                    <span
                                        class="text-[10px] font-mono text-white/50 uppercase tracking-wider"
                                        >New Team</span
                                    >
                                </div>
                            </div>

                            <div class="space-y-1.5 text-right">
                                <span
                                    class="text-[9px] font-mono text-white/20 uppercase tracking-widest block"
                                >
                                    Partner Status
                                </span>
                                <div
                                    class="flex items-center justify-end gap-2"
                                >
                                    <!-- Fixed: was `color: blue88` (a literal string bug) — now correct -->
                                    <svg
                                        class="w-3.5 h-3.5 shrink-0 text-[#FFF200] opacity-70"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        title="Official OWCS Partner"
                                    >
                                        <path
                                            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.44 3.814 3.745 3.745 0 01-3.814.44A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.153-1.593 3.745 3.745 0 01-3.814-.44 3.745 3.745 0 01-.44-3.814A3.745 3.745 0 013 12a3.745 3.745 0 011.593-3.153 3.745 3.745 0 01.44-3.814 3.745 3.745 0 013.814-.44A3.742 3.742 0 0112 3a3.745 3.745 0 013.153 1.593 3.745 3.745 0 013.814.44 3.745 3.745 0 01.44 3.814A3.745 3.745 0 0121 12z"
                                        />
                                    </svg>
                                    <span
                                        class="text-[10px] font-mono text-white/50 uppercase tracking-wider"
                                        >OWCS Partner Team</span
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</aside>
