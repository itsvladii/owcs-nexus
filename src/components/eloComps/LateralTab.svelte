
<script lang="ts">
    import { Activity, Zap, Scale, Globe, ArrowUp, ArrowDown } from 'lucide-svelte';
    import { fade, fly } from 'svelte/transition';

    export let regionalAverages: { name: string; avg: number; trend: number }[] = [];

    const REGION_COLORS: Record<string, string> = {
        "Korea": "#6eff18",
        "North America": "#823bf2",
        "EMEA": "#54c4c4",
        "Pacific": "#58cdff",
        "China": "#f7c525",
        "Japan": "#ec0201",
    };

    const SECTIONS = [
        {
            title: "The Engine",
            icon: Scale,
            color: "text-amber-500",
            desc: "A custom ELO system where points transfer from loser to winner based on tournament context and margin of victory."
        },
        {
            title: "Dynamic K-Factor",
            icon: Activity,
            color: "text-blue-500",
            desc: "Not all matches tell the same story. The K-Factor varies based on the context of the team playing, where they play and how they play."
        },
        {
            title: "Region Strength",
            icon: Globe,
            color: "text-emerald-500",
            desc: "Teams start with different regional baselines based on historical performance of their respective regions."
        },
        {
            title: "Inactivity Fallback",
            icon: Zap,
            color: "text-red-500",
            desc: "Rosters that change >3 players trigger a hard reset. Teams that have not played official OWCS matches for a while (>90 days) are removed from the leaderboard."
        }
    ];

    let activeTab: 'algorithm' | 'regions' = 'regions';

    // Reactive maxWidth for bar scaling
    $: maxWidth = regionalAverages[0]?.avg || 1200;
</script>

<aside class="w-full lg:w-80 shrink-0 space-y-8">
    <div class="sticky top-24 space-y-6">

        <div class="flex gap-2 p-1.5 bg-neutral-900/80 border border-white/5 rounded-xl backdrop-blur-md">
            <button
                type="button"
                on:click={() => activeTab = 'algorithm'}
                class="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all rounded-lg {activeTab === 'algorithm' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}"
            >
                Algorithm
            </button>
            <button
                type="button"
                on:click={() => activeTab = 'regions'}
                class="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all rounded-lg {activeTab === 'regions' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}"
            >
                Avg. Region Power
            </button>
        </div>

        <div class="min-h-[480px]">
            {#if activeTab === 'algorithm'}
                <div in:fade={{ duration: 300 }} class="space-y-6">
                    <div>
                        <h3 class="font-title font-bold text-2xl uppercase text-white mb-1">How It Works</h3>
                        <p class="text-xs text-neutral-500 uppercase tracking-widest font-mono">Algorithm v1.0 (2026)</p>
                    </div>

                    <div class="space-y-4">
                        {#each SECTIONS as s}
                            <div class="group bg-neutral-900/50 border border-white/5 rounded-xl p-4 hover:bg-white/5 transition-colors">
                                <div class="flex items-start gap-3">
                                    <div class="mt-1 p-2 rounded bg-neutral-950 border border-white/5 {s.color} group-hover:text-white transition-colors">
                                        <svelte:component this={s.icon} size={16} />
                                    </div>
                                    <div>
                                        <h4 class="text-sm font-bold text-white uppercase mb-1.5">{s.title}</h4>
                                        <p class="text-xs text-neutral-400 leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <a href="/algorithm" class="block w-full py-3 text-center border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white hover:border-white hover:bg-white/5 transition-all">
                        Read Full ELO Documentation
                    </a>
                </div>
            {:else}
                <div in:fade={{ duration: 300 }} class="space-y-6">
                    <div>
                        <h3 class="font-title font-bold text-2xl uppercase text-white mb-1 text-emerald-500">Regional Average Power</h3>
                        <p class="text-xs text-neutral-500 uppercase tracking-widest font-mono">Real-Time Regional Strength</p>
                    </div>

                    <div class="space-y-5 px-1">
                        {#each regionalAverages as reg, idx (reg.name)}
                            {@const regionColor = REGION_COLORS[reg.name] || "#737373"}
                            <div class="group">
                                <div class="flex justify-between items-end mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                            {idx + 1}. {reg.name}
                                        </span>
                                        {#if reg.trend !== 0}
                                            <span class="flex items-center text-[8px] font-mono font-bold {reg.trend > 0 ? 'text-emerald-500' : 'text-red-500'}">
                                                {reg.trend > 0 ? '▲' : '▼'} {Math.abs(reg.trend)}
                                            </span>
                                        {/if}
                                    </div>

                                    <span
                                        class="text-sm font-mono font-black"
                                        style="color: {regionColor}; text-shadow: 0 0 10px {regionColor}44"
                                    >
                                        {reg.avg}
                                    </span>
                                </div>

                                <div class="w-full bg-neutral-900/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        class="h-full transition-all duration-1000 ease-out"
                                        style="width: {(reg.avg / maxWidth) * 100}%; background: linear-gradient(90deg, {regionColor}88 0%, {regionColor} 100%); box-shadow: 0 0 12px {regionColor}33"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <p class="text-[9px] font-mono text-neutral-600 uppercase leading-relaxed pt-4 border-t border-white/5 italic">
                        * Based on mean rating of top 5 active rosters per region.
                    </p>

                    <div class="mt-10 pt-6 border-t border-white/5 space-y-6">
                        <h4 class="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-4">Legend & Status</h4>

                        <div class="space-y-2">
                            <span class="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Rank Climb (7D)</span>
                            <div class="flex items-center gap-6">
                                <div class="flex items-center gap-2 text-emerald-500 font-bold text-[10px] font-mono">
                                    <ArrowUp size={15} />
                                    <span>CLIMB</span>
                                </div>
                                <div class="flex items-center gap-2 text-red-500 font-bold text-[10px] font-mono">
                                    <ArrowDown size={15} />
                                    <span>DROP</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-between">
                            <div class="space-y-2">
                                <span class="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Calibration</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-mono text-white uppercase tracking-wider">New Team</span>
                                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                </div>
                            </div>

                            <div class="space-y-2 text-right">
                                <span class="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Partner Status</span>
                                <div class="flex items-center justify-end gap-3">
                                    <div class="flex items-center gap-0.5">
                                        {#each Object.values(REGION_COLORS) as color}
                                            <span class="w-1 h-3 rounded-full" style="background-color: {color}80"></span>
                                        {/each}
                                    </div>
                                    <span class="text-[10px] font-mono text-white uppercase tracking-wider">Official OWCS Partner Team</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</aside>