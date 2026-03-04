<script lang="ts">
    import { getHeroPortrait } from "../../lib/stats/fetchHeroImg.ts";

    interface BanEntry {
        hero: string;
        count: number;
        banRate: number;
        winRate: number;
    }

    interface TournamentStats {
        tournament: string;
        totalMaps: number;
        totalBanSlots: number;
        bans: BanEntry[];
    }

    interface TournamentOption {
        value: string;
        label: string;
    }

    export let allStats: TournamentStats;
    export let perTournament: Record<string, TournamentStats>;
    export let tournamentOptions: TournamentOption[];

    $: tournaments = tournamentOptions
        .filter((o) => o.value !== "All")
        .map((o) => ({ value: o.value, label: o.label }));

    $: heroes = [...allStats.bans]
        .sort((a, b) => b.count - a.count)
        .map((b) => b.hero);

    $: matrix = (() => {
        const m: Record<string, Record<string, number>> = {};
        for (const hero of heroes) {
            m[hero] = {};
            for (const t of tournaments) {
                const stats = perTournament[t.value];
                const entry = stats?.bans.find((b) => b.hero === hero);
                m[hero][t.value] = entry?.count ?? 0;
            }
        }
        return m;
    })();

    $: colMax = (() => {
        const maxes: Record<string, number> = {};
        for (const t of tournaments) {
            const vals = heroes.map((h) => matrix[h]?.[t.value] ?? 0);
            maxes[t.value] = Math.max(...vals, 1);
        }
        return maxes;
    })();

    let showAllHeroes = false;
    const PREVIEW_ROWS = 12;
    $: visibleHeroes = showAllHeroes ? heroes : heroes.slice(0, PREVIEW_ROWS);

    // Tooltip — use clientX/Y (viewport-relative) with fixed positioning
    let hovered: {
        hero: string;
        tournament: string;
        count: number;
        totalMaps: number;
    } | null = null;
    let tooltipX = 0;
    let tooltipY = 0;

    function onCellEnter(
        e: MouseEvent,
        hero: string,
        t: { value: string; label: string },
    ) {
        const stats = perTournament[t.value];
        const entry = stats?.bans.find((b) => b.hero === hero);
        hovered = {
            hero,
            tournament: t.label,
            count: entry?.count ?? 0,
            totalMaps: stats?.totalMaps ?? 0,
        };
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        tooltipX = rect.left + rect.width / 2;
        tooltipY = rect.top - 8; // just above the cell
    }

    function onCellLeave() {
        hovered = null;
    }

    function cellColor(norm: number): string {
        if (norm === 0) return "bg-neutral-900 border-neutral-800";
        if (norm < 0.25) return "bg-violet-950/60 border-violet-900/40";
        if (norm < 0.5) return "bg-violet-900/60 border-violet-800/50";
        if (norm < 0.75) return "bg-violet-700/70 border-violet-600/60";
        return "bg-violet-500/80 border-violet-400/70";
    }

    function textColor(norm: number): string {
        if (norm === 0) return "text-neutral-700";
        if (norm < 0.25) return "text-violet-400/70";
        if (norm < 0.5) return "text-violet-300/80";
        return "text-white";
    }
</script>

<div class="mt-8">
    <!-- ── SECTION HEADER ── -->
    <div class="flex items-center gap-3 mb-6">
        <p
            class="text-neutral-500 font-mono text-xs uppercase tracking-[0.3em] shrink-0"
        >
            Regional Meta Heatmap
        </p>
        <div class="flex-1 h-px bg-neutral-800"></div>
        <p
            class="text-neutral-600 font-mono text-[10px] uppercase tracking-widest shrink-0"
        >
            ban frequency per tournament
        </p>
    </div>

    {#if tournaments.length === 0}
        <div
            class="flex items-center justify-center h-40 bg-neutral-900 rounded-2xl border border-neutral-800"
        >
            <p
                class="text-neutral-600 font-mono text-sm uppercase tracking-widest"
            >
                No tournament data yet
            </p>
        </div>
    {:else}
        <div
            class="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950"
        >
            <table
                class="w-full border-collapse"
                style="min-width: {160 + tournaments.length * 90}px"
            >
                <!-- ── COLUMN HEADERS ── -->
                <thead>
                    <tr>
                        <th
                            class="sticky left-0 z-20 bg-neutral-950 border-b border-r border-neutral-800 px-4 py-3 text-left w-44"
                        >
                            <span
                                class="text-xs font-mono text-neutral-500 uppercase tracking-widest"
                                >Hero</span
                            >
                        </th>
                        {#each tournaments as t}
                            <th
                                class="border-b border-neutral-800 px-2 py-3 text-center"
                                style="min-width: 90px"
                            >
                                <span
                                    class="text-[10px] font-mono text-neutral-400 uppercase tracking-widest leading-tight block"
                                >
                                    {t.label}
                                </span>
                            </th>
                        {/each}
                        <th
                            class="border-b border-l border-neutral-800 px-4 py-3 text-center"
                            style="min-width: 64px"
                        >
                            <span
                                class="text-xs font-mono text-neutral-500 uppercase tracking-widest"
                                >Total</span
                            >
                        </th>
                    </tr>
                </thead>

                <!-- ── ROWS ── -->
                <tbody>
                    {#each visibleHeroes as hero}
                        {@const totalBans =
                            allStats.bans.find((b) => b.hero === hero)?.count ??
                            0}
                        <tr class="group">
                            <!-- Hero name — sticky left -->
                            <td
                                class="sticky left-0 z-10 bg-neutral-950 border-b border-r border-neutral-800 px-3 py-2.5 group-hover:bg-neutral-900 transition-colors"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700/50"
                                    >
                                        <img
                                            src={getHeroPortrait(hero)}
                                            alt={hero}
                                            class="w-full h-full object-cover object-top"
                                            loading="lazy"
                                        />
                                    </div>
                                    <span
                                        class="font-title uppercase text-base text-neutral-300 group-hover:text-white transition-colors tracking-wide whitespace-nowrap"
                                    >
                                        {hero}
                                    </span>
                                </div>
                            </td>

                            <!-- Heatmap cells -->
                            {#each tournaments as t}
                                {@const count = matrix[hero]?.[t.value] ?? 0}
                                {@const norm = count / colMax[t.value]}
                                <td
                                    class="border-b border-neutral-800/50 p-1.5 text-center cursor-default"
                                    on:mouseenter={(e) =>
                                        onCellEnter(e, hero, t)}
                                    on:mouseleave={onCellLeave}
                                >
                                    <div
                                        class="mx-auto w-full rounded-lg border transition-all duration-200 flex items-center justify-center py-2.5
                    {cellColor(norm)} hover:scale-105 relative"
                                        style="min-height: 40px"
                                    >
                                        {#if count > 0}
                                            <span
                                                class="font-mono font-bold text-sm {textColor(
                                                    norm,
                                                )}">{count}</span
                                            >
                                        {:else}
                                            <span
                                                class="text-neutral-800 text-sm"
                                                >—</span
                                            >
                                        {/if}
                                    </div>
                                </td>
                            {/each}

                            <!-- Total -->
                            <td
                                class="border-b border-l border-neutral-800 px-4 py-2.5 text-center"
                            >
                                <span
                                    class="font-mono font-bold text-base text-violet-400"
                                    >{totalBans}</span
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- ── SHOW MORE ── -->
        {#if heroes.length > PREVIEW_ROWS}
            <div class="mt-4 flex justify-center">
                <button
                    on:click={() => (showAllHeroes = !showAllHeroes)}
                    class="px-6 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-600
            text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-widest
            rounded-lg transition-all"
                >
                    {showAllHeroes
                        ? "Show Less"
                        : `Show All ${heroes.length} Heroes`}
                </button>
            </div>
        {/if}

        <!-- ── COLOUR LEGEND ── -->
        <div class="mt-6 flex flex-wrap items-center gap-3">
            <p
                class="text-neutral-600 font-mono text-xs uppercase tracking-widest shrink-0"
            >
                Intensity
            </p>
            <div class="flex items-center gap-1.5">
                <div
                    class="w-7 h-5 rounded bg-neutral-900 border border-neutral-800"
                ></div>
                <div
                    class="w-7 h-5 rounded bg-violet-950/60 border border-violet-900/40"
                ></div>
                <div
                    class="w-7 h-5 rounded bg-violet-900/60 border border-violet-800/50"
                ></div>
                <div
                    class="w-7 h-5 rounded bg-violet-700/70 border border-violet-600/60"
                ></div>
                <div
                    class="w-7 h-5 rounded bg-violet-500/80 border border-violet-400/70"
                ></div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-neutral-500"
                    >Never banned</span
                >
                <span class="text-neutral-600">→</span>
                <span class="text-xs font-mono text-violet-400"
                    >Most banned</span
                >
            </div>
            <p
                class="text-neutral-600 font-mono text-[10px] ml-auto hidden md:block"
            >
                * intensity is normalised per tournament column
            </p>
        </div>
    {/if}
</div>

<!-- ── TOOLTIP — fixed to viewport so it always appears near the cell ── -->
{#if hovered}
    <div
        class="fixed z-[9999] pointer-events-none px-3 py-2.5 bg-neutral-900 border border-neutral-700
      rounded-xl shadow-2xl"
        style="left: {tooltipX}px; top: {tooltipY}px; transform: translate(-50%, -100%)"
    >
        <p class="font-title uppercase text-white text-base leading-tight">
            {hovered.hero}
        </p>
        <p class="text-xs font-mono text-neutral-400 mt-0.5">
            {hovered.tournament}
        </p>
        <p class="text-xs font-mono text-violet-400 mt-1">
            {hovered.count === 0
                ? "Not banned"
                : `Banned ${hovered.count}× across ${hovered.totalMaps} maps`}
        </p>
    </div>
{/if}
