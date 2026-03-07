<script lang="ts">
    import {
        getHeroPortrait,
        getHeroRole,
    } from "../../lib/stats/fetchHeroImg.ts";
    import MetaBanChart from "./StatsBanChart.svelte";

    // ── TYPES ──
    interface BanEntry {
        hero: string;
        count: number;
        maps: number;
        wins: number;
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
    interface TeamBanEntry {
        hero: string;
        count: number;
        pct: number;
    }
    interface TeamBanData {
        team: string;
        logo: string;
        logoDark: string;
        totalBans: number;
        bans: TeamBanEntry[];
    }

    // ── PROPS ──
    export let allStats: TournamentStats;
    export let perTournament: Record<string, TournamentStats>;
    export let tournamentOptions: TournamentOption[];
    export let teamBansAll: Record<string, TeamBanData>;
    export let teamBansPerTournament: Record<
        string,
        Record<string, TeamBanData>
    >;
    export let teamList: string[];

    type SortMode = "count" | "winRate";
    type ViewMode = "hero" | "team" | "region";

    // ── SHARED FILTER STATE ──
    let viewMode: ViewMode = "hero";
    let selectedStage = "All";
    let selectedTournament = "All";
    let sortMode: SortMode = "count";
    let showAll = false;

    // ── TEAM VIEW STATE ──
    let selectedTeam: string = "";
    $: if (teamList.length && !selectedTeam) selectedTeam = teamList[0];
    let dropdownOpen = false;
    let teamSearch = "";
    $: filteredTeams = teamList.filter((t) =>
        t.toLowerCase().includes(teamSearch.toLowerCase()),
    );

    // Click-outside action
    function clickOutside(node: HTMLElement, handler: () => void) {
        const onClick = (e: MouseEvent) => {
            if (!node.contains(e.target as Node)) handler();
        };
        document.addEventListener("click", onClick, true);
        return {
            destroy() {
                document.removeEventListener("click", onClick, true);
            },
        };
    }

    const PREVIEW_COUNT = 10;

    // ── TOURNAMENT CLASSIFICATION ──
    function classifyTournament(name: string): {
        stage: string;
        region: string;
    } {
        const n = name.toLowerCase();
        if (n.includes("world finals"))
            return { stage: "Majors", region: "World Finals" };
        if (n.includes("midseason"))
            return { stage: "Majors", region: "Midseason" };
        if (n.includes("champions clash"))
            return { stage: "Majors", region: "Champions Clash" };

        const stageMatch = n.match(/stage\s*(\d)/);
        const stage = stageMatch ? `Stage ${stageMatch[1]}` : "Other";
        let region = "Other";
        if (n.includes("na")) region = "NA";
        else if (n.includes("emea")) region = "EMEA";
        else if (n.includes("china")) region = "China";
        else if (n.includes("korea")) region = "Korea";
        else if (n.includes("japan")) region = "Japan";
        else if (n.includes("pacific")) region = "Pacific";
        return { stage, region };
    }

    const STAGE_ORDER = ["Stage 1", "Stage 2", "Stage 3", "Majors", "Other"];
    const REGION_STAGES = [
        "NA",
        "EMEA",
        "China",
        "Korea",
        "Japan",
        "Pacific",
        "Other",
    ];
    const REGION_MAJORS = [
        "Champions Clash",
        "Midseason",
        "World Finals",
        "Pre-Season",
    ];

    $: stageGroups = (() => {
        const groups: Record<string, Record<string, string[]>> = {};
        for (const opt of tournamentOptions) {
            if (opt.value === "All") continue;
            const { stage, region } = classifyTournament(opt.value);
            if (!groups[stage]) groups[stage] = {};
            if (!groups[stage][region]) groups[stage][region] = [];
            groups[stage][region].push(opt.value);
        }
        return groups;
    })();

    $: availableStages = STAGE_ORDER.filter((s) => stageGroups[s]);

    $: regionOptions = (() => {
        if (selectedStage === "All") return [];
        const group = stageGroups[selectedStage];
        if (!group) return [];
        const order =
            selectedStage === "Majors" ? REGION_MAJORS : REGION_STAGES;
        return order
            .filter((r) => group[r])
            .map((r) => ({ region: r, tournaments: group[r] }));
    })();

    function selectStage(stage: string) {
        selectedStage = stage;
        selectedTournament = "All";
        showAll = false;
    }
    function selectRegion(tournaments: string[]) {
        selectedTournament =
            tournaments.length === 1
                ? tournaments[0]
                : `__multi__${tournaments.join("|")}`;
        showAll = false;
    }

    function mergeStats(keys: string[]): TournamentStats {
        const merged: Record<string, { count: number; wins: number }> = {};
        let totalMaps = 0,
            totalBanSlots = 0;
        for (const k of keys) {
            const s = perTournament[k];
            if (!s) continue;
            totalMaps += s.totalMaps;
            totalBanSlots += s.totalBanSlots;
            for (const b of s.bans) {
                if (!merged[b.hero]) merged[b.hero] = { count: 0, wins: 0 };
                merged[b.hero].count += b.count;
                merged[b.hero].wins += b.wins;
            }
        }
        return {
            tournament: "Merged",
            totalMaps,
            totalBanSlots,
            bans: Object.entries(merged)
                .map(([hero, { count, wins }]) => ({
                    hero,
                    count,
                    maps: totalMaps,
                    wins,
                    banRate: totalBanSlots > 0 ? count / totalBanSlots : 0,
                    winRate: count > 0 ? wins / count : 0,
                }))
                .sort((a, b) => b.count - a.count),
        };
    }

    function mergeTeamStats(keys: string[], team: string): TeamBanData | null {
        const heroCounts: Record<string, number> = {};
        let totalBans = 0;
        let logo = "",
            logoDark = "";
        for (const k of keys) {
            const td = teamBansPerTournament[k]?.[team];
            if (!td) continue;
            logo = td.logo || logo;
            logoDark = td.logoDark || logoDark;
            for (const b of td.bans) {
                heroCounts[b.hero] = (heroCounts[b.hero] ?? 0) + b.count;
                totalBans += b.count;
            }
        }
        if (totalBans === 0) return null;
        return {
            team,
            logo,
            logoDark,
            totalBans,
            bans: Object.entries(heroCounts)
                .map(([hero, count]) => ({
                    hero,
                    count,
                    pct: totalBans > 0 ? count / totalBans : 0,
                }))
                .sort((a, b) => b.count - a.count),
        };
    }

    $: activeTournamentKeys = (() => {
        if (selectedTournament === "All") {
            if (selectedStage !== "All") {
                const group = stageGroups[selectedStage];
                return group ? Object.values(group).flat() : null;
            }
            return null; // null = use "All"
        }
        if (selectedTournament.startsWith("__multi__"))
            return selectedTournament.replace("__multi__", "").split("|");
        return [selectedTournament];
    })();

    $: activeStats = (() => {
        if (!activeTournamentKeys) return allStats;
        if (activeTournamentKeys.length === 1)
            return perTournament[activeTournamentKeys[0]] ?? allStats;
        return mergeStats(activeTournamentKeys);
    })();

    $: activeTeamData = (() => {
        if (!selectedTeam) return null;
        if (!activeTournamentKeys) return teamBansAll[selectedTeam] ?? null;
        if (activeTournamentKeys.length === 1)
            return (
                teamBansPerTournament[activeTournamentKeys[0]]?.[
                    selectedTeam
                ] ?? null
            );
        return mergeTeamStats(activeTournamentKeys, selectedTeam);
    })();

    $: sorted = [...(activeStats.bans ?? [])].sort((a, b) =>
        sortMode === "count" ? b.count - a.count : b.winRate - a.winRate,
    );
    $: displayed = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);
    $: maxCount = sorted[0]?.count ?? 1;

    $: activeRegion = (() => {
        if (selectedTournament === "All") return null;
        for (const ro of regionOptions) {
            const key =
                ro.tournaments.length === 1
                    ? ro.tournaments[0]
                    : `__multi__${ro.tournaments.join("|")}`;
            if (key === selectedTournament) return ro.region;
        }
        return null;
    })();

    $: contextLabel =
        selectedStage === "All"
            ? "All Tournaments"
            : selectedTournament === "All"
              ? `${selectedStage} — All Regions`
              : activeRegion
                ? `${selectedStage} · ${activeRegion}`
                : (tournamentOptions.find((o) => o.value === selectedTournament)
                      ?.label ?? "");

    // ── PIE CHART HELPERS ──
    const PIE_OTHER_COLOR = "#2a2a2a";

    // Generate a luminance scale from bright violet (most bans) to dim (least)
    // Returns hex colors from high to low brightness for N slices
    function buildColorScale(n: number): string[] {
        if (n === 0) return [];
        return Array.from({ length: n }, (_, i) => {
            // i=0 is the most banned → brightest; i=n-1 → dimmest
            const t = n === 1 ? 0 : i / (n - 1); // 0 = brightest, 1 = dimmest
            // Interpolate: bright violet #a855f7 → dim #3b1f5e
            const r = Math.round(168 - t * (168 - 59));
            const g = Math.round(85 - t * (85 - 31));
            const b = Math.round(247 - t * (247 - 94));
            return `rgb(${r},${g},${b})`;
        });
    }

    // Only top N heroes in the pie, rest go to "Other"
    const PIE_MAX = 8;

    // Single source of truth: hero → color, used by BOTH pie and list
    $: colorMap = (() => {
        if (!activeTeamData) return {} as Record<string, string>;
        const top = activeTeamData.bans.slice(0, PIE_MAX);
        const scale = buildColorScale(top.length);
        const map: Record<string, string> = {};
        top.forEach((b, i) => {
            map[b.hero] = scale[i];
        });
        // remaining heroes beyond PIE_MAX
        activeTeamData.bans.slice(PIE_MAX).forEach((b) => {
            map[b.hero] = PIE_OTHER_COLOR;
        });
        return map;
    })();

    $: pieData = (() => {
        if (!activeTeamData) return [];
        const top = activeTeamData.bans.slice(0, PIE_MAX);
        const otherCount = activeTeamData.bans
            .slice(PIE_MAX)
            .reduce((acc, b) => acc + b.count, 0);
        const slices = top.map((b) => ({ ...b, color: colorMap[b.hero] }));
        if (otherCount > 0)
            slices.push({
                hero: "Other",
                count: otherCount,
                pct:
                    activeTeamData.totalBans > 0
                        ? otherCount / activeTeamData.totalBans
                        : 0,
                color: PIE_OTHER_COLOR,
            });
        return slices;
    })();

    // SVG donut chart path generation
    function polarToCartesian(
        cx: number,
        cy: number,
        r: number,
        angleDeg: number,
    ) {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    function arcPath(
        cx: number,
        cy: number,
        r: number,
        startAngle: number,
        endAngle: number,
    ): string {
        const start = polarToCartesian(cx, cy, r, startAngle);
        const end = polarToCartesian(cx, cy, r, endAngle);
        const large = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
    }

    $: pieSlices = (() => {
        if (!pieData.length) return [];
        const total = pieData.reduce((a, b) => a + b.count, 0);
        const slices: {
            path: string;
            color: string;
            hero: string;
            pct: number;
            midAngle: number;
        }[] = [];
        let currentAngle = 0;
        for (const slice of pieData) {
            const angle = (slice.count / total) * 360;
            const endAngle = currentAngle + angle;
            slices.push({
                path: arcPath(100, 100, 80, currentAngle, endAngle - 0.5),
                color: slice.color,
                hero: slice.hero,
                pct: slice.pct,
                midAngle: currentAngle + angle / 2,
            });
            currentAngle = endAngle;
        }
        return slices;
    })();

    let hoveredSlice: string | null = null;

    // Role breakdown: count bans by Tank / Damage / Support
    $: roleSplit = (() => {
        if (!activeTeamData) return { Tank: 0, Damage: 0, Support: 0 };
        const counts = { Tank: 0, Damage: 0, Support: 0 };
        for (const b of activeTeamData.bans) {
            const role = getHeroRole(b.hero);
            counts[role] += b.count;
        }
        const total = activeTeamData.totalBans || 1;
        return {
            Tank: {
                count: counts.Tank,
                pct: Math.round((counts.Tank / total) * 100),
            },
            Damage: {
                count: counts.Damage,
                pct: Math.round((counts.Damage / total) * 100),
            },
            Support: {
                count: counts.Support,
                pct: Math.round((counts.Support / total) * 100),
            },
        };
    })();

    const ROLE_COLORS = {
        Tank: "#60a5fa",
        Damage: "#f87171",
        Support: "#34d399",
    };
</script>

<div>
    <!-- ── VIEW MODE TOGGLE ── -->
    <div class="flex items-center justify-between mb-6">
        <div
            class="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1"
        >
            <button
                on:click={() => {
                    viewMode = "hero";
                    showAll = false;
                }}
                class="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all
          {viewMode === 'hero'
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'}"
            >
                By Hero
            </button>
            <button
                on:click={() => {
                    viewMode = "team";
                    showAll = false;
                }}
                class="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all
          {viewMode === 'team'
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'}"
            >
                By Team
            </button>
            <button
                on:click={() => {
                    viewMode = "region";
                    showAll = false;
                }}
                class="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all
          {viewMode === 'region'
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'}"
            >
                By Region
            </button>
        </div>
    </div>

    <!-- ── SHARED: STAGE TABS ── -->
    {#if viewMode !== "region"}
        <div class="flex items-center gap-1 border-b border-neutral-800 mb-0">
            <button
                on:click={() => selectStage("All")}
                class="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all -mb-px
        {selectedStage === 'All'
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'}"
                >All</button
            >
            {#each availableStages as stage}
                <button
                    on:click={() => selectStage(stage)}
                    class="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all -mb-px
          {selectedStage === stage
                        ? 'border-violet-500 text-violet-300'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'}"
                    >{stage}</button
                >
            {/each}
        </div>

        <!-- ── SHARED: REGION PILLS ── -->
        <div class="min-h-[48px] flex items-center mt-3 mb-6">
            {#if selectedStage !== "All" && regionOptions.length > 0}
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        on:click={() => {
                            selectedTournament = "All";
                            showAll = false;
                        }}
                        class="px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border transition-all
            {selectedTournament === 'All'
                            ? 'bg-neutral-700 border-neutral-600 text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}"
                        >All</button
                    >
                    {#each regionOptions as ro}
                        <button
                            on:click={() => selectRegion(ro.tournaments)}
                            class="px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border transition-all
              {activeRegion === ro.region
                                ? 'bg-neutral-700 border-neutral-600 text-white'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}"
                            >{ro.region}</button
                        >
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- ════════════════════════════════════════
      VIEW: BY HERO
  ════════════════════════════════════════ -->
    {#if viewMode === "hero"}
        <div class="flex items-center justify-between gap-4 mb-6">
            <p
                class="text-neutral-500 font-mono text-xs uppercase tracking-widest"
            >
                {activeStats.totalBanSlots} bans · {activeStats.totalMaps} maps ·
                {contextLabel}
            </p>
            <div
                class="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 shrink-0"
            >
                <button
                    on:click={() => (sortMode = "count")}
                    class="px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-widest transition-all
            {sortMode === 'count'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-500 hover:text-neutral-300'}"
                    >Ban Count</button
                >
                <button
                    on:click={() => (sortMode = "winRate")}
                    class="px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-widest transition-all
            {sortMode === 'winRate'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-500 hover:text-neutral-300'}"
                    >Win Rate</button
                >
            </div>
        </div>

        <div
            class="grid grid-cols-12 gap-4 px-4 mb-2 text-neutral-500 font-mono text-xs uppercase tracking-widest mb-1"
        >
            <div class="col-span-1 text-center">#</div>
            <div class="col-span-4">Hero</div>
            <div class="col-span-3">Ban Rate</div>
            <div class="col-span-2 text-center">Bans</div>
            <div class="col-span-2 text-center">Win Rate</div>
        </div>

        <div class="flex flex-col gap-1">
            {#each displayed as ban, i (ban.hero)}
                {@const isTop = i === 0 && sortMode === "count"}
                {@const barWidth = (ban.count / maxCount) * 100}
                {@const winPct = (ban.winRate * 100).toFixed(0)}
                {@const banPct = (ban.banRate * 100).toFixed(1)}
                <div
                    class="group grid grid-cols-12 gap-4 px-4 py-2 rounded-xl items-center
          bg-neutral-900/50 hover:bg-neutral-900 border border-transparent hover:border-neutral-800
          transition-all relative overflow-hidden py-1"
                >
                    <div
                        class="absolute left-0 top-0 bottom-0 bg-violet-500/5 rounded-xl pointer-events-none transition-all duration-500"
                        style="width: {barWidth}%"
                    ></div>
                    <div class="col-span-1 text-center relative z-10">
                        {#if isTop}
                            <span
                                class="text-violet-400 font-title text-xl leading-none"
                                >#1</span
                            >
                        {:else}
                            <span class="text-neutral-500 font-mono text-base"
                                >{i + 1}</span
                            >
                        {/if}
                    </div>
                    <div
                        class="col-span-4 relative z-10 flex items-center gap-3"
                    >
                        <div
                            class="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700"
                        >
                            <img
                                src={getHeroPortrait(ban.hero)}
                                alt={ban.hero}
                                class="w-full h-full object-cover object-top"
                                loading="lazy"
                            />
                        </div>
                        <span
                            class="font-title uppercase text-lg leading-tight tracking-wide {isTop
                                ? 'text-white'
                                : 'text-neutral-300'}">{ban.hero}</span
                        >
                    </div>
                    <div
                        class="col-span-3 relative z-10 flex items-center gap-3"
                    >
                        <div
                            class="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden hidden sm:block"
                        >
                            <div
                                class="h-full rounded-full transition-all duration-500 {isTop
                                    ? 'bg-violet-400'
                                    : 'bg-neutral-500'}"
                                style="width: {barWidth}%"
                            ></div>
                        </div>
                        <span
                            class="text-sm font-mono text-neutral-400 w-12 text-right shrink-0"
                            >{banPct}%</span
                        >
                    </div>
                    <div class="col-span-2 text-center relative z-10">
                        <span
                            class="font-mono font-bold text-lg {isTop
                                ? 'text-violet-400'
                                : 'text-neutral-300'}">{ban.count}</span
                        >
                    </div>
                    <div class="col-span-2 text-center relative z-10">
                        <span
                            class="font-mono text-lg
              {Number(winPct) >= 60
                                ? 'text-emerald-400'
                                : Number(winPct) <= 40
                                  ? 'text-red-400'
                                  : 'text-neutral-400'}"
                        >
                            {winPct}%
                        </span>
                    </div>
                </div>
            {/each}
        </div>

        {#if sorted.length > PREVIEW_COUNT}
            <div class="mt-6 flex justify-center">
                <button
                    on:click={() => (showAll = !showAll)}
                    class="px-6 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-600
            text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-widest rounded-lg transition-all"
                >
                    {showAll ? "Show Less" : `Show All ${sorted.length} Heroes`}
                </button>
            </div>
        {/if}

        <div
            class="mt-8 pt-6 border-t border-neutral-800 flex flex-wrap items-center gap-6"
        >
            <p
                class="text-neutral-700 font-mono text-[9px] uppercase tracking-widest"
            >
                Win rate key
            </p>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span><span
                    class="text-xs font-mono text-neutral-400"
                    >≥ 60% — banning team usually wins</span
                >
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-neutral-400"></span><span
                    class="text-xs font-mono text-neutral-400"
                    >40–60% — neutral</span
                >
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-400"></span><span
                    class="text-xs font-mono text-neutral-400"
                    >≤ 40% — banning team usually loses</span
                >
            </div>
            <p
                class="text-neutral-700 font-mono text-[9px] ml-auto hidden md:block"
            >
                * win rate = did the banning team win that map
            </p>
        </div>
    {/if}

    <!-- ════════════════════════════════════════
      VIEW: BY TEAM
  ════════════════════════════════════════ -->
    {#if viewMode === "team"}
        <div class="flex items-center justify-between gap-4 mb-8">
            <p
                class="text-neutral-600 font-mono text-[10px] uppercase tracking-widest truncate"
            >
                {contextLabel}
            </p>
        </div>

        <!-- ── TEAM SELECTOR DROPDOWN ── -->
        <div
            class="mb-8 relative"
            use:clickOutside={() => (dropdownOpen = false)}
        >
            <p
                class="text-neutral-500 font-mono text-xs uppercase tracking-widest mb-3"
            >
                Select Team
            </p>

            <!-- Trigger -->
            <button
                on:click={() => (dropdownOpen = !dropdownOpen)}
                class="flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 hover:border-neutral-500
          rounded-xl transition-all w-full md:w-80 text-left"
            >
                {#if activeTeamData?.logo}
                    <img
                        src={activeTeamData.logoDark || activeTeamData.logo}
                        alt={selectedTeam}
                        class="w-6 h-6 object-contain shrink-0"
                    />
                {/if}
                <span
                    class="font-title uppercase text-sm text-white tracking-wide flex-1"
                    >{selectedTeam || "Choose a team"}</span
                >
                <svg
                    class="w-4 h-4 text-neutral-500 transition-transform {dropdownOpen
                        ? 'rotate-180'
                        : ''}"
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
            </button>

            <!-- Dropdown -->
            {#if dropdownOpen}
                <div
                    class="absolute top-full left-0 mt-2 w-full md:w-80 bg-neutral-900 border border-neutral-700
          rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                    <!-- Search -->
                    <div class="p-2 border-b border-neutral-800">
                        <input
                            bind:value={teamSearch}
                            placeholder="Search team..."
                            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2
                text-sm text-white placeholder-neutral-500 font-mono outline-none
                focus:border-violet-500 transition-colors"
                        />
                    </div>
                    <!-- List -->
                    <div class="max-h-64 overflow-y-auto">
                        {#each filteredTeams as team}
                            {@const td = teamBansAll[team]}
                            <button
                                on:click={() => {
                                    selectedTeam = team;
                                    dropdownOpen = false;
                                    teamSearch = "";
                                }}
                                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all
                  {selectedTeam === team
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}"
                            >
                                {#if td?.logo}
                                    <img
                                        src={td.logoDark || td.logo}
                                        alt={team}
                                        class="w-5 h-5 object-contain shrink-0"
                                    />
                                {:else}
                                    <div class="w-5 h-5 shrink-0"></div>
                                {/if}
                                <span
                                    class="font-title uppercase text-sm tracking-wide"
                                    >{team}</span
                                >
                            </button>
                        {/each}
                        {#if filteredTeams.length === 0}
                            <p
                                class="px-4 py-3 text-neutral-600 font-mono text-xs"
                            >
                                No teams found
                            </p>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Team ban breakdown -->
        {#if activeTeamData}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- ── DONUT CHART ── -->
                <div
                    class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 self-start"
                >
                    <div class="flex items-center gap-3 mb-6">
                        {#if activeTeamData.logo}
                            <img
                                src={activeTeamData.logoDark ||
                                    activeTeamData.logo}
                                alt={activeTeamData.team}
                                class="w-8 h-8 object-contain"
                            />
                        {/if}
                        <div>
                            <p
                                class="font-title uppercase text-white tracking-wide"
                            >
                                {activeTeamData.team}
                            </p>
                            <p class="text-xs font-mono text-neutral-400">
                                {activeTeamData.totalBans} bans total · {contextLabel}
                            </p>
                        </div>
                    </div>

                    <div class="relative flex items-center justify-center">
                        <svg viewBox="0 0 200 200" class="w-56 h-56">
                            {#each pieSlices as slice}
                                <path
                                    d={slice.path}
                                    fill="none"
                                    stroke={slice.color}
                                    stroke-width={hoveredSlice === slice.hero
                                        ? 22
                                        : 18}
                                    stroke-linecap="butt"
                                    class="transition-all duration-150 cursor-pointer"
                                    on:mouseenter={() =>
                                        (hoveredSlice = slice.hero)}
                                    on:mouseleave={() => (hoveredSlice = null)}
                                />
                            {/each}
                            <!-- Center label -->
                            {#if hoveredSlice}
                                {@const hs = pieData.find(
                                    (p) => p.hero === hoveredSlice,
                                )}
                                {#if hs}
                                    <text
                                        x="100"
                                        y="93"
                                        text-anchor="middle"
                                        class="fill-white font-bold"
                                        style="font-size: 11px; font-family: inherit;"
                                    >
                                        {hs.hero}
                                    </text>
                                    <text
                                        x="100"
                                        y="113"
                                        text-anchor="middle"
                                        class="fill-violet-400 font-black"
                                        style="font-size: 20px; font-family: monospace;"
                                    >
                                        {(hs.pct * 100).toFixed(0)}%
                                    </text>
                                    <text
                                        x="100"
                                        y="128"
                                        text-anchor="middle"
                                        class="fill-neutral-500"
                                        style="font-size: 9px; font-family: monospace;"
                                    >
                                        {hs.count} ban{hs.count !== 1
                                            ? "s"
                                            : ""}
                                    </text>
                                {/if}
                            {:else}
                                <text
                                    x="100"
                                    y="97"
                                    text-anchor="middle"
                                    class="fill-neutral-500"
                                    style="font-size: 9px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em;"
                                >
                                    BAN SPLIT
                                </text>
                                <text
                                    x="100"
                                    y="116"
                                    text-anchor="middle"
                                    class="fill-white font-black"
                                    style="font-size: 18px; font-family: monospace;"
                                >
                                    {activeTeamData.totalBans}
                                </text>
                            {/if}
                        </svg>
                    </div>
                    <!--/* ── ROLE BREAKDOWN ── */-->
                    {#if activeTeamData}
                        <div class="mt-5 pt-4 border-t border-neutral-800">
                            <p
                                class="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3"
                            >
                                Role Split
                            </p>
                            <div class="flex flex-col gap-2">
                                {#each Object.entries(roleSplit) as [role, data]}
                                    <div class="flex items-center gap-3">
                                        <span
                                            class="font-mono text-[10px] uppercase tracking-widest w-16 shrink-0"
                                            style="color: {ROLE_COLORS[role]}"
                                            >{role}</span
                                        >
                                        <div
                                            class="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden"
                                        >
                                            <div
                                                class="h-full rounded-full transition-all duration-500"
                                                style="width: {data.pct}%; background: {ROLE_COLORS[
                                                    role
                                                ]}"
                                            ></div>
                                        </div>
                                        <span
                                            class="font-mono text-sm font-bold text-neutral-300 w-10 text-right shrink-0"
                                        >
                                            {data.pct}%
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- ── BAN LIST ── -->
                <div class="flex flex-col gap-1">
                    <div
                        class="grid grid-cols-12 gap-3 px-3 mb-2 text-neutral-500 font-mono text-[10px] uppercase tracking-widest"
                    >
                        <div class="col-span-1"></div>
                        <div class="col-span-5">Hero</div>
                        <div class="col-span-4">Share</div>
                        <div class="col-span-2 text-right">Bans</div>
                    </div>
                    {#each activeTeamData.bans as ban, i}
                        {@const color = colorMap[ban.hero] ?? PIE_OTHER_COLOR}
                        {@const barWidth =
                            (ban.count / (activeTeamData.bans[0]?.count ?? 1)) *
                            100}
                        <div
                            class="grid grid-cols-12 gap-3 px-3 py-2 rounded-xl items-center transition-all cursor-default
                {hoveredSlice === ban.hero
                                ? 'bg-neutral-800 border border-neutral-700'
                                : 'bg-neutral-900/50 border border-transparent'}"
                            on:mouseenter={() => (hoveredSlice = ban.hero)}
                            on:mouseleave={() => (hoveredSlice = null)}
                        >
                            <!-- Color dot -->
                            <div class="col-span-1 flex justify-center">
                                <span
                                    class="w-2.5 h-2.5 rounded-full shrink-0"
                                    style="background: {color}"
                                ></span>
                            </div>
                            <!-- Portrait + name -->
                            <div class="col-span-5 flex items-center gap-2.5">
                                <div
                                    class="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700"
                                >
                                    <img
                                        src={getHeroPortrait(ban.hero)}
                                        alt={ban.hero}
                                        class="w-full h-full object-cover object-top"
                                        loading="lazy"
                                    />
                                </div>
                                <span
                                    class="font-title uppercase text-base text-neutral-300 tracking-wide leading-tight"
                                    >{ban.hero}</span
                                >
                            </div>
                            <!-- Bar + pct -->
                            <div class="col-span-4 flex items-center gap-2">
                                <div
                                    class="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden"
                                >
                                    <div
                                        class="h-full rounded-full"
                                        style="width: {barWidth}%; background: {color}"
                                    ></div>
                                </div>
                                <span
                                    class="text-sm font-mono text-neutral-400 w-10 text-right shrink-0"
                                    >{(ban.pct * 100).toFixed(0)}%</span
                                >
                            </div>
                            <!-- Count -->
                            <div class="col-span-2 text-right">
                                <span
                                    class="font-mono font-bold text-lg text-neutral-300"
                                    >{ban.count}</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div
                class="flex items-center justify-center h-40 bg-neutral-900 rounded-2xl border border-neutral-800"
            >
                <p
                    class="text-neutral-600 font-mono text-xs uppercase tracking-widest"
                >
                    No ban data for {selectedTeam} in this tournament
                </p>
            </div>
        {/if}
    {/if}

    <!-- ════════════════════════════════════════
      VIEW: BY REGION
  ════════════════════════════════════════ -->
    {#if viewMode === "region"}
        <MetaBanChart {allStats} {perTournament} {tournamentOptions} />
    {/if}
</div>
