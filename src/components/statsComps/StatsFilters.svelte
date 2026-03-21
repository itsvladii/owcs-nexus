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

    let viewMode: ViewMode = "hero";
    let selectedStage = "All";
    let selectedTournament = "All";
    let sortMode: SortMode = "count";
    let showAll = false;

    // Team filter state
    let selectedTeam: string = "";
    $: if (teamList.length && !selectedTeam) selectedTeam = teamList[0];
    let dropdownOpen = false;
    let teamSearch = "";
    $: filteredTeams = teamList.filter((t) =>
        t.toLowerCase().includes(teamSearch.toLowerCase()),
    );

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

    // Basic tournament classifier based on name keywords
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
        if (n.includes("china")) region = "China";
        else if (n.includes("emea")) region = "EMEA";
        else if (n.includes("na")) region = "NA";
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
        let totalBans = 0,
            logo = "",
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
            return null;
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

    const PIE_OTHER_COLOR = "rgba(255,255,255,0.08)";

    // #7B2FFF bright → #2a1660 dark
    function buildColorScale(n: number): string[] {
        if (n === 0) return [];
        return Array.from({ length: n }, (_, i) => {
            const t = n === 1 ? 0 : i / (n - 1);
            const r = Math.round(123 - t * (123 - 42));
            const g = Math.round(47 - t * (47 - 22));
            const b = Math.round(255 - t * (255 - 96));
            return `rgb(${r},${g},${b})`;
        });
    }

    const PIE_MAX = 8;

    $: colorMap = (() => {
        if (!activeTeamData) return {} as Record<string, string>;
        const top = activeTeamData.bans.slice(0, PIE_MAX);
        const scale = buildColorScale(top.length);
        const map: Record<string, string> = {};
        top.forEach((b, i) => {
            map[b.hero] = scale[i];
        });
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

    // Role colors on team view
    const ROLE_COLORS = {
        Tank: "#60a5fa",
        Damage: "#f87171",
        Support: "#34d399",
    };
</script>

<div>
    <!-- View Mode Toggle -->
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-0 border border-white/8">
            {#each [["hero", "By Hero"], ["team", "By Team"], ["region", "By Region"]] as [mode, label]}
                <button
                    on:click={() => {
                        viewMode = mode;
                        showAll = false;
                    }}
                    class="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all border-r border-white/8 last:border-r-0
                    {viewMode === mode
                        ? 'bg-[#7B2FFF] text-white'
                        : 'bg-transparent text-white/25 hover:text-white/60 hover:bg-white/[0.03]'}"
                >
                    {label}
                </button>
            {/each}
        </div>
    </div>

    <!-- stage tabs -->
    {#if viewMode !== "region"}
        <div class="flex items-center gap-0 border-b border-white/5 mb-0">
            <button
                on:click={() => selectStage("All")}
                class="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all -mb-px
                {selectedStage === 'All'
                    ? 'border-[#7B2FFF] text-[#7B2FFF]'
                    : 'border-transparent text-white/25 hover:text-white/50'}"
                >All</button
            >
            {#each availableStages as stage}
                <button
                    on:click={() => selectStage(stage)}
                    class="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all -mb-px
                    {selectedStage === stage
                        ? 'border-[#7B2FFF] text-[#7B2FFF]'
                        : 'border-transparent text-white/25 hover:text-white/50'}"
                    >{stage}</button
                >
            {/each}
        </div>

        <!-- region tabs -->
        <div class="min-h-[48px] flex items-center mt-3 mb-6">
            {#if selectedStage !== "All" && regionOptions.length > 0}
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        on:click={() => {
                            selectedTournament = "All";
                            showAll = false;
                        }}
                        class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-all
                        {selectedTournament === 'All'
                            ? 'bg-[#7B2FFF] border-[#7B2FFF] text-white'
                            : 'bg-transparent border-white/10 text-white/30 hover:border-white/25 hover:text-white/60'}"
                        >All</button
                    >
                    {#each regionOptions as ro}
                        <button
                            on:click={() => selectRegion(ro.tournaments)}
                            class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-all
                            {activeRegion === ro.region
                                ? 'bg-[#7B2FFF] border-[#7B2FFF] text-white'
                                : 'bg-transparent border-white/10 text-white/30 hover:border-white/25 hover:text-white/60'}"
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
                class="text-white/20 font-mono text-[10px] uppercase tracking-widest"
            >
                {activeStats.totalBanSlots} bans · {activeStats.totalMaps} maps ·
                {contextLabel}
            </p>
            <!-- Sort toggle — square, #7B2FFF active -->
            <div class="flex items-center gap-0 border border-white/8 shrink-0">
                <button
                    on:click={() => (sortMode = "count")}
                    class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all border-r border-white/8
                    {sortMode === 'count'
                        ? 'bg-[#7B2FFF] text-white'
                        : 'bg-transparent text-white/25 hover:text-white/60'}"
                    >Ban Count</button
                >
                <button
                    on:click={() => (sortMode = "winRate")}
                    class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all
                    {sortMode === 'winRate'
                        ? 'bg-[#7B2FFF] text-white'
                        : 'bg-transparent text-white/25 hover:text-white/60'}"
                    >Win Rate</button
                >
            </div>
        </div>

        <!-- Table header -->
        <div
            class="grid grid-cols-12 gap-4 px-4 pb-3 text-white/20 font-mono text-[10px] uppercase tracking-widest border-b border-white/5"
        >
            <div class="col-span-1 text-center">#</div>
            <div class="col-span-4">Hero</div>
            <div class="col-span-3">Ban Rate</div>
            <div class="col-span-2 text-center">Bans</div>
            <div class="col-span-2 text-center">Win Rate</div>
        </div>

        <!-- Hero rows — flat list, sharp, no rounded -->
        <div class="flex flex-col">
            {#each displayed as ban, i (ban.hero)}
                {@const isTop = i === 0 && sortMode === "count"}
                {@const barWidth = (ban.count / maxCount) * 100}
                {@const winPct = (ban.winRate * 100).toFixed(0)}
                {@const banPct = (ban.banRate * 100).toFixed(1)}
                <div
                    class="group grid grid-cols-12 gap-4 px-4 py-4 items-center
                    border-b border-white/[0.04] hover:bg-white/[0.02]
                    transition-all relative overflow-hidden"
                >
                    <!-- Background bar fill -->
                    <div
                        class="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500"
                        style="width: {barWidth}%; background: rgba(123,47,255,0.04)"
                    ></div>

                    <!-- Rank -->
                    <div class="col-span-1 text-center relative z-10">
                        {#if isTop}
                            <span
                                class="font-title text-2xl leading-none"
                                style="color: #7B2FFF">#1</span
                            >
                        {:else}
                            <span class="text-white/20 font-mono text-base"
                                >{i + 1}</span
                            >
                        {/if}
                    </div>

                    <!-- Portrait + name -->
                    <div
                        class="col-span-4 relative z-10 flex items-center gap-4"
                    >
                        <div
                            class="w-12 h-12 overflow-hidden shrink-0 bg-white/[0.04] border border-white/5"
                        >
                            <img
                                src={getHeroPortrait(ban.hero)}
                                alt={ban.hero}
                                class="w-full h-full object-cover object-top"
                                loading="lazy"
                            />
                        </div>
                        <span
                            class="font-title uppercase text-lg leading-tight tracking-wide
                            {isTop
                                ? 'text-white'
                                : 'text-white/60 group-hover:text-white/90'} transition-colors"
                        >
                            {ban.hero}
                        </span>
                    </div>

                    <!-- Ban rate bar + pct -->
                    <div
                        class="col-span-3 relative z-10 flex items-center gap-3"
                    >
                        <div
                            class="flex-1 h-[2px] bg-white/[0.06] overflow-hidden hidden sm:block"
                        >
                            <div
                                class="h-full transition-all duration-500"
                                style="width: {barWidth}%; background: {isTop
                                    ? '#7B2FFF'
                                    : 'rgba(255,255,255,0.2)'}"
                            ></div>
                        </div>
                        <span
                            class="text-base font-mono text-white/35 w-14 text-right shrink-0"
                            >{banPct}%</span
                        >
                    </div>

                    <!-- Ban count -->
                    <div class="col-span-2 text-center relative z-10">
                        <span
                            class="font-mono font-bold text-xl"
                            style="color: {isTop
                                ? '#7B2FFF'
                                : 'rgba(255,255,255,0.5)'}"
                        >
                            {ban.count}
                        </span>
                    </div>

                    <!-- Win rate — LFP functional palette -->
                    <div class="col-span-2 text-center relative z-10">
                        <span
                            class="font-mono text-xl"
                            style="color: {Number(winPct) >= 60
                                ? '#0CD905'
                                : Number(winPct) <= 40
                                  ? '#D90000'
                                  : 'rgba(255,255,255,0.35)'}"
                        >
                            {winPct}%
                        </span>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Show more -->
        {#if sorted.length > PREVIEW_COUNT}
            <div class="mt-4 flex justify-center">
                <button
                    on:click={() => (showAll = !showAll)}
                    class="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10
                    hover:border-[#7B2FFF] hover:text-[#7B2FFF] text-white/30
                    font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                    {#if showAll}
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
                        Show All {sorted.length} Heroes
                    {/if}
                </button>
            </div>
        {/if}

        <!-- Win rate legend -->
        <div
            class="mt-8 pt-5 border-t border-white/5 flex flex-wrap items-center gap-5"
        >
            <p
                class="text-white/15 font-mono text-[9px] uppercase tracking-widest shrink-0"
            >
                Win rate key
            </p>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 shrink-0" style="background: #0CD905"
                ></span>
                <span class="text-[10px] font-mono text-white/30"
                    >≥ 60% — banning team usually wins</span
                >
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 shrink-0 bg-white/25"></span>
                <span class="text-[10px] font-mono text-white/30"
                    >40–60% — neutral</span
                >
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 shrink-0" style="background: #D90000"
                ></span>
                <span class="text-[10px] font-mono text-white/30"
                    >≤ 40% — banning team usually loses</span
                >
            </div>
            <p
                class="text-white/10 font-mono text-[9px] ml-auto hidden md:block italic"
            >
                * win rate = did the banning team win that map
            </p>
        </div>
    {/if}

    <!-- ════════════════════════════════════════
      VIEW: BY TEAM
    ════════════════════════════════════════ -->
    {#if viewMode === "team"}
        <div class="flex items-center justify-between gap-4 mb-6">
            <p
                class="text-white/20 font-mono text-[10px] uppercase tracking-widest truncate"
            >
                {contextLabel}
            </p>
        </div>

        <!-- ── TEAM SELECTOR ── sharp, purple hover/focus -->
        <div
            class="mb-8 relative"
            use:clickOutside={() => (dropdownOpen = false)}
        >
            <p
                class="text-white/25 font-mono text-[10px] uppercase tracking-widest mb-3"
            >
                Select Team
            </p>

            <!-- Trigger -->
            <button
                on:click={() => (dropdownOpen = !dropdownOpen)}
                class="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/10
                hover:border-[#7B2FFF] transition-all w-full md:w-80 text-left"
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
                >
                    {selectedTeam || "Choose a team"}
                </span>
                <svg
                    class="w-4 h-4 text-white/25 transition-transform {dropdownOpen
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

            <!-- Dropdown — sharp, no rounded -->
            {#if dropdownOpen}
                <div
                    class="absolute top-full left-0 mt-1 w-full md:w-80 bg-[#0d0d0d] border border-white/10 shadow-2xl z-50 overflow-hidden"
                >
                    <!-- Search -->
                    <div class="p-2 border-b border-white/5">
                        <input
                            bind:value={teamSearch}
                            placeholder="Search team..."
                            class="w-full bg-white/[0.04] border border-white/8 px-3 py-2
                            text-sm text-white placeholder-white/20 font-mono outline-none
                            focus:border-[#7B2FFF] transition-colors"
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
                                    ? 'bg-[rgba(123,47,255,0.15)] text-[#7B2FFF]'
                                    : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80'}"
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
                                class="px-4 py-3 text-white/20 font-mono text-xs"
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
                <!-- ── DONUT CHART CARD ── sharp, no rounded -->
                <div
                    class="bg-white/[0.02] border border-white/5 p-6 self-start"
                >
                    <!-- Team header -->
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
                            <p class="text-[10px] font-mono text-white/30">
                                {activeTeamData.totalBans} bans · {contextLabel}
                            </p>
                        </div>
                    </div>

                    <!-- SVG Donut -->
                    <div class="relative flex items-center justify-center">
                        <svg viewBox="0 0 200 200" class="w-52 h-52">
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
                                        style="font-size: 11px; font-family: inherit; fill: rgba(255,255,255,0.8); font-weight: bold"
                                    >
                                        {hs.hero}
                                    </text>
                                    <text
                                        x="100"
                                        y="113"
                                        text-anchor="middle"
                                        style="font-size: 20px; font-family: monospace; fill: #7B2FFF; font-weight: 900"
                                    >
                                        {(hs.pct * 100).toFixed(0)}%
                                    </text>
                                    <text
                                        x="100"
                                        y="128"
                                        text-anchor="middle"
                                        style="font-size: 9px; font-family: monospace; fill: rgba(255,255,255,0.2)"
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
                                    style="font-size: 9px; font-family: monospace; fill: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.1em"
                                >
                                    BAN SPLIT
                                </text>
                                <text
                                    x="100"
                                    y="116"
                                    text-anchor="middle"
                                    style="font-size: 18px; font-family: monospace; fill: white; font-weight: 900"
                                >
                                    {activeTeamData.totalBans}
                                </text>
                            {/if}
                        </svg>
                    </div>

                    <!-- Role breakdown -->
                    <div class="mt-5 pt-4 border-t border-white/5">
                        <p
                            class="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-3"
                        >
                            Role Split
                        </p>
                        <div class="flex flex-col gap-3">
                            {#each Object.entries(roleSplit) as [role, data]}
                                <div class="flex items-center gap-3">
                                    <span
                                        class="font-mono text-[10px] uppercase tracking-widest w-16 shrink-0"
                                        style="color: {ROLE_COLORS[role]}"
                                        >{role}</span
                                    >
                                    <div
                                        class="flex-1 h-[2px] bg-white/[0.06] overflow-hidden"
                                    >
                                        <div
                                            class="h-full transition-all duration-500"
                                            style="width: {data.pct}%; background: {ROLE_COLORS[
                                                role
                                            ]}"
                                        ></div>
                                    </div>
                                    <span
                                        class="font-mono text-sm font-bold text-white/40 w-10 text-right shrink-0"
                                    >
                                        {data.pct}%
                                    </span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- ── BAN LIST ── flat rows, sharp -->
                <div class="flex flex-col">
                    <div
                        class="grid grid-cols-12 gap-3 px-3 pb-3 text-white/20 font-mono text-[10px] uppercase tracking-widest border-b border-white/5"
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
                            class="grid grid-cols-12 gap-3 px-3 py-2.5 items-center transition-all cursor-default
                            border-b border-white/[0.04]
                            {hoveredSlice === ban.hero
                                ? 'bg-white/[0.04]'
                                : 'hover:bg-white/[0.02]'}"
                            on:mouseenter={() => (hoveredSlice = ban.hero)}
                            on:mouseleave={() => (hoveredSlice = null)}
                        >
                            <!-- Color square (not dot) -->
                            <div class="col-span-1 flex justify-center">
                                <span
                                    class="w-2.5 h-2.5 shrink-0"
                                    style="background: {color}"
                                ></span>
                            </div>
                            <!-- Portrait + name -->
                            <div class="col-span-5 flex items-center gap-2.5">
                                <div
                                    class="w-9 h-9 overflow-hidden shrink-0 bg-white/[0.04] border border-white/5"
                                >
                                    <img
                                        src={getHeroPortrait(ban.hero)}
                                        alt={ban.hero}
                                        class="w-full h-full object-cover object-top"
                                        loading="lazy"
                                    />
                                </div>
                                <span
                                    class="font-title uppercase text-sm text-white/60 tracking-wide leading-tight
                                    {hoveredSlice === ban.hero
                                        ? 'text-white/90'
                                        : ''}"
                                >
                                    {ban.hero}
                                </span>
                            </div>
                            <!-- Bar + pct -->
                            <div class="col-span-4 flex items-center gap-2">
                                <div
                                    class="flex-1 h-[2px] bg-white/[0.06] overflow-hidden"
                                >
                                    <div
                                        class="h-full transition-all duration-300"
                                        style="width: {barWidth}%; background: {color}"
                                    ></div>
                                </div>
                                <span
                                    class="text-sm font-mono text-white/30 w-10 text-right shrink-0"
                                >
                                    {(ban.pct * 100).toFixed(0)}%
                                </span>
                            </div>
                            <!-- Count -->
                            <div class="col-span-2 text-right">
                                <span
                                    class="font-mono font-bold text-base text-white/50"
                                    >{ban.count}</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div
                class="flex items-center justify-center h-40 bg-white/[0.02] border border-white/5"
            >
                <p
                    class="text-white/20 font-mono text-xs uppercase tracking-widest"
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
