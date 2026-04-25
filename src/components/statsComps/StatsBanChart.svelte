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

    // ── Column type after aggregation ──
    interface RegionColumn {
        key: string;          // unique key for matrix lookup (e.g. "Stage 1|Korea")
        label: string;        // header label shown in the table
        stats: TournamentStats;
    }

    export let allStats: TournamentStats;
    export let perTournament: Record<string, TournamentStats>;
    export let tournamentOptions: TournamentOption[];

    // ── Same classifier as StatsFilters ──
    function classifyTournament(name: string): { stage: string; region: string } {
        const n = name.toLowerCase();
        if (n.includes("world finals")) return { stage: "Majors", region: "World Finals" };
        if (n.includes("midseason"))    return { stage: "Majors", region: "Midseason" };
        if (n.includes("champions clash")) return { stage: "Majors", region: "Champions Clash" };
        const stageMatch = n.match(/stage\s*(\d)/);
        const stage = stageMatch ? `Stage ${stageMatch[1]}` : "Other";
        let region = "Other";
        if (n.includes("china"))   region = "China";
        else if (n.includes("emea"))    region = "EMEA";
        else if (n.includes("na"))      region = "NA";
        else if (n.includes("korea"))   region = "Korea";
        else if (n.includes("japan"))   region = "Japan";
        else if (n.includes("pacific")) region = "Pacific";
        return { stage, region };
    }

    const STAGE_ORDER   = ["Stage 1", "Stage 2", "Stage 3", "Majors", "Other"];
    const REGION_STAGES = ["NA", "EMEA", "China", "Korea", "Japan", "Pacific", "Other"];
    const REGION_MAJORS = ["Champions Clash", "Midseason", "World Finals", "Pre-Season"];

    // ── Merge multiple tournament keys into one TournamentStats ──
    function mergeStats(keys: string[]): TournamentStats {
        const merged: Record<string, { count: number; wins: number }> = {};
        let totalMaps = 0, totalBanSlots = 0;
        for (const k of keys) {
            const s = perTournament[k];
            if (!s) continue;
            totalMaps      += s.totalMaps;
            totalBanSlots  += s.totalBanSlots;
            for (const b of s.bans) {
                if (!merged[b.hero]) merged[b.hero] = { count: 0, wins: 0 };
                merged[b.hero].count += b.count;
            }
        }
        return {
            tournament: "Merged",
            totalMaps,
            totalBanSlots,
            bans: Object.entries(merged)
                .map(([hero, { count }]) => ({
                    hero,
                    count,
                    maps: totalMaps,
                    wins: 0,
                    banRate: totalBanSlots > 0 ? count / totalBanSlots : 0,
                    winRate: 0,
                }))
                .sort((a, b) => b.count - a.count),
        };
    }

    // ── Build one column per stage+region, merging all tournament keys in that group ──
    $: columns = (() => {
        // group: stage → region → string[]
        const groups: Record<string, Record<string, string[]>> = {};
        for (const opt of tournamentOptions) {
            if (opt.value === "All") continue;
            const { stage, region } = classifyTournament(opt.value);
            if (!groups[stage]) groups[stage] = {};
            if (!groups[stage][region]) groups[stage][region] = [];
            groups[stage][region].push(opt.value);
        }

        const cols: RegionColumn[] = [];
        for (const stage of STAGE_ORDER) {
            if (!groups[stage]) continue;
            const regionList = stage === "Majors" ? REGION_MAJORS : REGION_STAGES;
            for (const region of regionList) {
                const keys = groups[stage]?.[region];
                if (!keys?.length) continue;
                const key = `${stage}|${region}`;
                // single tournament: use it directly; multiple: merge
                const stats = keys.length === 1
                    ? (perTournament[keys[0]] ?? mergeStats(keys))
                    : mergeStats(keys);
                cols.push({
                    key,
                    label: `OWCS '26 –\n${region} ${stage}`,
                    stats,
                });
            }
        }
        return cols;
    })();

    $: heroes = [...allStats.bans]
        .sort((a, b) => b.count - a.count)
        .map((b) => b.hero);

    // matrix: hero → column key → count
    $: matrix = (() => {
        const m: Record<string, Record<string, number>> = {};
        for (const hero of heroes) {
            m[hero] = {};
            for (const col of columns) {
                const entry = col.stats.bans.find((b) => b.hero === hero);
                m[hero][col.key] = entry?.count ?? 0;
            }
        }
        return m;
    })();

    // normalise per column
    $: colMax = (() => {
        const maxes: Record<string, number> = {};
        for (const col of columns) {
            const vals = heroes.map((h) => matrix[h]?.[col.key] ?? 0);
            maxes[col.key] = Math.max(...vals, 1);
        }
        return maxes;
    })();

    let showAllHeroes = false;
    const PREVIEW_ROWS = 12;
    $: visibleHeroes = showAllHeroes ? heroes : heroes.slice(0, PREVIEW_ROWS);

    let hovered: {
        hero: string;
        label: string;
        count: number;
        totalMaps: number;
    } | null = null;
    let tooltipX = 0;
    let tooltipY = 0;

    function onCellEnter(e: MouseEvent, hero: string, col: RegionColumn) {
        const entry = col.stats.bans.find((b) => b.hero === hero);
        hovered = {
            hero,
            label: col.label.replace("\n", " "),
            count: entry?.count ?? 0,
            totalMaps: col.stats.totalMaps,
        };
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        tooltipX = rect.left + rect.width / 2;
        tooltipY = rect.top - 8;
    }

    function onCellLeave() {
        hovered = null;
    }

    function cellBg(norm: number): string {
        if (norm === 0)    return "background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04)";
        if (norm < 0.25)   return "background: rgba(123,47,255,0.12); border-color: rgba(123,47,255,0.20)";
        if (norm < 0.5)    return "background: rgba(123,47,255,0.28); border-color: rgba(123,47,255,0.35)";
        if (norm < 0.75)   return "background: rgba(123,47,255,0.50); border-color: rgba(123,47,255,0.55)";
        return "background: rgba(123,47,255,0.80); border-color: rgba(123,47,255,0.90)";
    }

    function cellTextColor(norm: number): string {
        if (norm === 0)  return "color: rgba(255,255,255,0.12)";
        if (norm < 0.25) return "color: rgba(255,255,255,0.45)";
        if (norm < 0.5)  return "color: rgba(255,255,255,0.70)";
        return "color: rgba(255,255,255,1)";
    }
</script>

<div class="mt-8">
    <!--header-->
    <div class="flex items-center gap-3 mb-6">
        <p class="text-white/30 font-mono text-xs uppercase tracking-[0.3em] shrink-0">
            Meta Heatmap
        </p>
        <div class="flex-1 h-px bg-white/5"></div>
        <p class="text-white/15 font-mono text-[10px] uppercase tracking-widest shrink-0">
            Ban frequency per tournament
        </p>
    </div>

    {#if columns.length === 0}
        <div class="flex items-center justify-center h-40 bg-white/[0.02] border border-white/5">
            <p class="text-white/20 font-mono text-sm uppercase tracking-widest">
                No tournament data yet
            </p>
        </div>
    {:else}
        <!-- TABLE -->
        <div class="overflow-x-auto border border-white/5 bg-[#0d0d0d]">
            <table
                class="w-full border-collapse"
                style="min-width: {160 + columns.length * 90}px"
            >
                <!-- ── COLUMN HEADERS ── -->
                <thead>
                    <tr>
                        <th class="sticky left-0 z-20 bg-[#0d0d0d] border-b border-r border-white/5 px-4 py-3 text-left w-44">
                            <span class="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                                Hero
                            </span>
                        </th>
                        {#each columns as col}
                            <th
                                class="border-b border-white/5 px-2 py-3 text-center"
                                style="min-width: 90px"
                            >
                                <!-- Split label on the \n so region and stage sit on separate lines -->
                                {#each col.label.split("\n") as line}
                                    <span class="text-[10px] font-mono text-white/25 uppercase tracking-widest leading-tight block">
                                        {line}
                                    </span>
                                {/each}
                            </th>
                        {/each}
                        <th class="border-b border-l border-white/5 px-4 py-3 text-center" style="min-width: 64px">
                            <span class="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                                Total
                            </span>
                        </th>
                    </tr>
                </thead>

                <!-- ── ROWS ── -->
                <tbody>
                    {#each visibleHeroes as hero}
                        {@const totalBans = allStats.bans.find((b) => b.hero === hero)?.count ?? 0}
                        <tr class="group border-b border-white/[0.04] last:border-0">
                            <!-- hero name -->
                            <td class="sticky left-0 z-10 bg-[#0d0d0d] border-r border-white/5 px-3 py-2 group-hover:bg-white/[0.02] transition-colors">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 overflow-hidden shrink-0 bg-white/[0.04] border border-white/5">
                                        <img
                                            src={getHeroPortrait(hero)}
                                            alt={hero}
                                            class="w-full h-full object-cover object-top"
                                            loading="lazy"
                                        />
                                    </div>
                                    <span class="font-title uppercase text-sm text-white/50 group-hover:text-white/80 transition-colors tracking-wide whitespace-nowrap">
                                        {hero}
                                    </span>
                                </div>
                            </td>

                            <!-- heatmap cells -->
                            {#each columns as col}
                                {@const count = matrix[hero]?.[col.key] ?? 0}
                                {@const norm  = count / colMax[col.key]}
                                <td
                                    class="border-white/[0.03] p-1 text-center cursor-default"
                                    on:mouseenter={(e) => onCellEnter(e, hero, col)}
                                    on:mouseleave={onCellLeave}
                                >
                                    <div
                                        class="mx-auto w-full border transition-colors duration-200 flex items-center justify-center py-2.5"
                                        style="{cellBg(norm)}; min-height: 38px"
                                    >
                                        {#if count > 0}
                                            <span class="font-mono font-bold text-sm" style={cellTextColor(norm)}>
                                                {count}
                                            </span>
                                        {:else}
                                            <span style="color: rgba(255,255,255,0.08)" class="text-sm">—</span>
                                        {/if}
                                    </div>
                                </td>
                            {/each}

                            <!-- total -->
                            <td class="border-l border-white/5 px-4 py-2 text-center">
                                <span
                                    class="font-mono font-bold text-sm"
                                    style="color: rgba(123,47,255,{0.5 + (totalBans / (allStats.bans[0]?.count ?? 1)) * 0.5})"
                                >
                                    {totalBans}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- SHOW MORE HEROES -->
        {#if heroes.length > PREVIEW_ROWS}
            <div class="mt-4 flex justify-center">
                <button
                    on:click={() => (showAllHeroes = !showAllHeroes)}
                    class="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10
                    hover:border-[#7B2FFF] hover:text-[#7B2FFF] text-white/30
                    font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                    {#if showAllHeroes}
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                        Show Less
                    {:else}
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        Show All {heroes.length} Heroes
                    {/if}
                </button>
            </div>
        {/if}

        <!-- COLOUR LEGEND -->
        <div class="mt-5 flex flex-wrap items-center gap-3">
            <p class="text-white/20 font-mono text-[10px] uppercase tracking-widest shrink-0">
                Intensity
            </p>
            <div class="flex items-center gap-1">
                <div class="w-6 h-4 border" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04)"></div>
                <div class="w-6 h-4 border" style="background: rgba(123,47,255,0.12); border-color: rgba(123,47,255,0.20)"></div>
                <div class="w-6 h-4 border" style="background: rgba(123,47,255,0.28); border-color: rgba(123,47,255,0.35)"></div>
                <div class="w-6 h-4 border" style="background: rgba(123,47,255,0.50); border-color: rgba(123,47,255,0.55)"></div>
                <div class="w-6 h-4 border" style="background: rgba(123,47,255,0.80); border-color: rgba(123,47,255,0.90)"></div>
            </div>
            <div class="flex items-center gap-2 text-[10px] font-mono">
                <span class="text-white/20">Never banned</span>
                <span class="text-white/10">→</span>
                <span style="color: rgba(123,47,255,0.9)">Most banned</span>
            </div>
            <p class="text-white/10 font-mono text-[9px] ml-auto hidden md:block italic">
                * intensity normalised per tournament column
            </p>
        </div>
    {/if}
</div>

<!-- TOOLTIP -->
{#if hovered}
    <div
        class="fixed z-[9999] pointer-events-none px-3 py-2.5 bg-[#0d0d0d] border border-white/10 shadow-2xl"
        style="left: {tooltipX}px; top: {tooltipY}px; transform: translate(-50%, -100%)"
    >
        <p class="font-title uppercase text-white text-base leading-tight">{hovered.hero}</p>
        <p class="text-[10px] font-mono text-white/30 mt-0.5 uppercase tracking-widest">
            {hovered.label}
        </p>
        <p class="text-[11px] font-mono mt-1.5" style="color: rgba(123,47,255,0.9)">
            {hovered.count === 0
                ? "Not banned"
                : `Banned ${hovered.count}× · ${hovered.totalMaps} maps`}
        </p>
    </div>
{/if}
