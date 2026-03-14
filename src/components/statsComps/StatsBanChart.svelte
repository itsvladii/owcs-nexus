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
        tooltipY = rect.top - 8;
    }

    function onCellLeave() {
        hovered = null;
    }

    function cellBg(norm: number): string {
        if (norm === 0)
            return "background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04)";
        if (norm < 0.25)
            return "background: rgba(123,47,255,0.12); border-color: rgba(123,47,255,0.20)";
        if (norm < 0.5)
            return "background: rgba(123,47,255,0.28); border-color: rgba(123,47,255,0.35)";
        if (norm < 0.75)
            return "background: rgba(123,47,255,0.50); border-color: rgba(123,47,255,0.55)";
        return "background: rgba(123,47,255,0.80); border-color: rgba(123,47,255,0.90)";
    }

    function cellTextColor(norm: number): string {
        if (norm === 0) return "color: rgba(255,255,255,0.12)";
        if (norm < 0.25) return "color: rgba(255,255,255,0.45)";
        if (norm < 0.5) return "color: rgba(255,255,255,0.70)";
        return "color: rgba(255,255,255,1)";
    }
</script>

<div class="mt-8">
    <!--header-->
    <div class="flex items-center gap-3 mb-6">
        <p
            class="text-white/30 font-mono text-xs uppercase tracking-[0.3em] shrink-0"
        >
            Meta Heatmap
        </p>
        <div class="flex-1 h-px bg-white/5"></div>
        <p
            class="text-white/15 font-mono text-[10px] uppercase tracking-widest shrink-0"
        >
            Ban frequency per tournament
        </p>
    </div>

    <!-- fallback for no data -->
    {#if tournaments.length === 0}
        <div
            class="flex items-center justify-center h-40 bg-white/[0.02] border border-white/5"
        >
            <p
                class="text-white/20 font-mono text-sm uppercase tracking-widest"
            >
                No tournament data yet
            </p>
        </div>
    {:else}
        <!-- TABLE -->
        <div class="overflow-x-auto border border-white/5 bg-[#0d0d0d]">
            <table
                class="w-full border-collapse"
                style="min-width: {160 + tournaments.length * 90}px"
            >
                <!-- ── COLUMN HEADERS ── -->
                <thead>
                    <tr>
                        <th
                            class="sticky left-0 z-20 bg-[#0d0d0d] border-b border-r border-white/5 px-4 py-3 text-left w-44"
                        >
                            <span
                                class="text-[10px] font-mono text-white/20 uppercase tracking-widest"
                            >
                                Hero
                            </span>
                        </th>
                        {#each tournaments as t}
                            <th
                                class="border-b border-white/5 px-2 py-3 text-center"
                                style="min-width: 90px"
                            >
                                <span
                                    class="text-[10px] font-mono text-white/25 uppercase tracking-widest leading-tight block"
                                >
                                    {t.label}
                                </span>
                            </th>
                        {/each}
                        <th
                            class="border-b border-l border-white/5 px-4 py-3 text-center"
                            style="min-width: 64px"
                        >
                            <span
                                class="text-[10px] font-mono text-white/20 uppercase tracking-widest"
                            >
                                Total
                            </span>
                        </th>
                    </tr>
                </thead>

                <!-- ── ROWS ── -->
                <tbody>
                    {#each visibleHeroes as hero}
                        {@const totalBans =
                            allStats.bans.find((b) => b.hero === hero)?.count ??
                            0}
                        <tr
                            class="group border-b border-white/[0.04] last:border-0"
                        >
                            <!-- hero name-->
                            <td
                                class="sticky left-0 z-10 bg-[#0d0d0d] border-r border-white/5 px-3 py-2 group-hover:bg-white/[0.02] transition-colors"
                            >
                                <div class="flex items-center gap-3">
                                    <!-- hero img-->
                                    <div
                                        class="w-9 h-9 overflow-hidden shrink-0 bg-white/[0.04] border border-white/5"
                                    >
                                        <img
                                            src={getHeroPortrait(hero)}
                                            alt={hero}
                                            class="w-full h-full object-cover object-top"
                                            loading="lazy"
                                        />
                                    </div>
                                    <span
                                        class="font-title uppercase text-sm text-white/50 group-hover:text-white/80 transition-colors tracking-wide whitespace-nowrap"
                                    >
                                        {hero}
                                    </span>
                                </div>
                            </td>

                            <!-- heatmap cells -->
                            {#each tournaments as t}
                                {@const count = matrix[hero]?.[t.value] ?? 0}
                                {@const norm = count / colMax[t.value]}
                                <td
                                    class="border-white/[0.03] p-1 text-center cursor-default"
                                    on:mouseenter={(e) =>
                                        onCellEnter(e, hero, t)}
                                    on:mouseleave={onCellLeave}
                                >
                                    <!-- cells -->
                                    <div
                                        class="mx-auto w-full border transition-colors duration-200 flex items-center justify-center py-2.5"
                                        style="{cellBg(norm)}; min-height: 38px"
                                    >
                                        {#if count > 0}
                                            <span
                                                class="font-mono font-bold text-sm"
                                                style={cellTextColor(norm)}
                                                >{count}</span
                                            >
                                        {:else}
                                            <span
                                                style="color: rgba(255,255,255,0.08)"
                                                class="text-sm">—</span
                                            >
                                        {/if}
                                    </div>
                                </td>
                            {/each}

                            <!--total number of bans-->
                            <td
                                class="border-l border-white/5 px-4 py-2 text-center"
                            >
                                <span
                                    class="font-mono font-bold text-sm"
                                    style="color: rgba(123,47,255,{0.5 +
                                        (totalBans /
                                            (allStats.bans[0]?.count ?? 1)) *
                                            0.5})"
                                >
                                    {totalBans}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- SHOW MORE HEROES-->
        {#if heroes.length > PREVIEW_ROWS}
            <div class="mt-4 flex justify-center">
                <button
                    on:click={() => (showAllHeroes = !showAllHeroes)}
                    class="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10
                    hover:border-[#7B2FFF] hover:text-[#7B2FFF] text-white/30
                    font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                    {#if showAllHeroes}
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
                                d="M5 15l7-7 7 7"
                            />
                        </svg>
                        Show Less
                    {:else}
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
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                        Show All {heroes.length} Heroes
                    {/if}
                </button>
            </div>
        {/if}

        <!-- ── COLOUR LEGEND ── -->
        <div class="mt-5 flex flex-wrap items-center gap-3">
            <p
                class="text-white/20 font-mono text-[10px] uppercase tracking-widest shrink-0"
            >
                Intensity
            </p>
            <div class="flex items-center gap-1">
                <div
                    class="w-6 h-4 border"
                    style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04)"
                ></div>
                <div
                    class="w-6 h-4 border"
                    style="background: rgba(123,47,255,0.12); border-color: rgba(123,47,255,0.20)"
                ></div>
                <div
                    class="w-6 h-4 border"
                    style="background: rgba(123,47,255,0.28); border-color: rgba(123,47,255,0.35)"
                ></div>
                <div
                    class="w-6 h-4 border"
                    style="background: rgba(123,47,255,0.50); border-color: rgba(123,47,255,0.55)"
                ></div>
                <div
                    class="w-6 h-4 border"
                    style="background: rgba(123,47,255,0.80); border-color: rgba(123,47,255,0.90)"
                ></div>
            </div>
            <div class="flex items-center gap-2 text-[10px] font-mono">
                <span class="text-white/20">Never banned</span>
                <span class="text-white/10">→</span>
                <span style="color: rgba(123,47,255,0.9)">Most banned</span>
            </div>
            <p
                class="text-white/10 font-mono text-[9px] ml-auto hidden md:block italic"
            >
                * intensity normalised per tournament column
            </p>
        </div>
    {/if}
</div>

<!-- TOOLTIP WHEN HOVERING ON REGION HEATMAP CELLS -->
{#if hovered}
    <div
        class="fixed z-[9999] pointer-events-none px-3 py-2.5 bg-[#0d0d0d] border border-white/10 shadow-2xl"
        style="left: {tooltipX}px; top: {tooltipY}px; transform: translate(-50%, -100%)"
    >
        <p class="font-title uppercase text-white text-base leading-tight">
            {hovered.hero}
        </p>
        <p
            class="text-[10px] font-mono text-white/30 mt-0.5 uppercase tracking-widest"
        >
            {hovered.tournament}
        </p>
        <p
            class="text-[11px] font-mono mt-1.5"
            style="color: rgba(123,47,255,0.9)"
        >
            {hovered.count === 0
                ? "Not banned"
                : `Banned ${hovered.count}× · ${hovered.totalMaps} maps`}
        </p>
    </div>
{/if}
