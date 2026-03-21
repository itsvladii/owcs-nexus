<script lang="ts">
    import ELOGraph from "./ELOGraph.svelte";
    import { fade } from "svelte/transition";
    import { flip } from "svelte/animate";

    export let teams: any[] = [];
    export let matches: any[] = [];

    let selectedTeam: any = null;
    let regionFilter = "All Regions";
    let showAll = false;
    const PREVIEW_ROWS = 30;

    const REGION_FILTERS = [
        "All Regions",
        "Korea",
        "North America",
        "EMEA",
        "China",
        "Pacific",
        "Japan",
    ];

    // LFP-aligned — Bleu Électrique as the unified region signal color
    const REGION_COLORS: Record<string, string> = {
        Korea: "#085FFF",
        "North America": "#085FFF",
        EMEA: "#085FFF",
        Pacific: "#085FFF",
        China: "#085FFF",
        Japan: "#085FFF",
    };

    // RankTable.svelte
    $: allFiltered = teams.filter((t) => {
        // 1. Must match the selected region (if not "All")
        const matchesRegion =
            regionFilter === "All Regions" || t.region === regionFilter;

        // 2. Must have at least one win to be shown on the public table
        const hasWonMatch = t.wins + t.losses > 0;

        return matchesRegion && hasWonMatch;
    });

    $: filteredTeams = showAll
        ? allFiltered
        : allFiltered.slice(0, PREVIEW_ROWS);

    function teleport(node: HTMLElement) {
        document.body.appendChild(node);
        return {
            destroy() {
                if (node.parentNode) node.parentNode.removeChild(node);
            },
        };
    }
</script>

<div class="relative">
    <!-- ── REGION FILTER PILLS ── -->
    <div class="flex flex-wrap items-center gap-2 mb-6 pt-4 pl-5">
        {#each REGION_FILTERS as r}
            <button
                on:click={() => (regionFilter = r)}
                class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-all
          {regionFilter === r
                    ? 'bg-[#085FFF] border-[#085FFF] text-white'
                    : 'bg-transparent border-white/10 text-white/30 hover:border-white/25 hover:text-white/60'}"
            >
                {r === "All Regions" ? "All" : r}
            </button>
        {/each}
    </div>

    <!-- ── TABLE HEADER ── -->
    <div
        class="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-12 gap-2 sm:gap-4 px-4 pb-3 text-white/20 font-mono text-[10px] uppercase tracking-widest border-b border-white/5"
    >
        <div class="text-center sm:col-span-1">#</div>
        <div class="sm:col-span-5">Team</div>
        <div class="text-right sm:text-center sm:col-span-2">Rating</div>
        <div class="col-span-2 text-center hidden sm:block">Record</div>
        <div class="col-span-2 text-center hidden sm:block">Form</div>
    </div>

    <!-- ── ROWS ── -->
    {#if filteredTeams.length > 0}
        <div class="flex flex-col">
            {#each filteredTeams as team (team.name)}
                {@const isTop3 = team.rank <= 3}

                <div
                    animate:flip={{ duration: 400 }}
                    on:click={() => (selectedTeam = team)}
                    on:keydown={(e) =>
                        e.key === "Enter" && (selectedTeam = team)}
                    role="button"
                    tabindex="0"
                    class="group grid grid-cols-[2rem_1fr_auto] sm:grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-3 items-center
                    cursor-pointer transition-all relative overflow-hidden
                    border-b border-white/[0.04] hover:bg-white/[0.025]
                    {team.rank === 1 ? 'bg-[rgba(8,95,255,0.05)]' : ''}"
                >
                    <!-- Left accent bar — Bleu Électrique, always on for rank 1, hover-reveal for rest -->
                    <div
                        class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#085FFF] transition-opacity duration-200
                        {team.rank === 1
                            ? 'opacity-50'
                            : 'opacity-0 group-hover:opacity-100'}"
                    ></div>

                    <!-- ── RANK ── -->
                    <div
                        class="sm:col-span-1 text-center relative z-10 flex flex-col items-center gap-0.5"
                    >
                        <span
                            class="font-title leading-none transition-transform group-hover:scale-110
                            {team.rank === 1
                                ? 'text-[#FF7FDE] text-2xl sm:text-3xl'
                                : team.rank === 2
                                  ? 'text-[#085FFF] text-xl sm:text-2xl'
                                  : team.rank === 3
                                    ? 'text-[#085FFF] text-xl sm:text-2xl'
                                    : 'text-white/25 text-lg sm:text-xl'}"
                        >
                            #{team.rank}
                        </span>
                        {#if team.rankDelta && team.rankDelta !== 0}
                            <div
                                class="flex items-center gap-0.5
                                {team.rankDelta > 0
                                    ? 'text-[#0CD905]'
                                    : 'text-[#D90000]'}"
                            >
                                <svg
                                    class="w-2.5 h-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {#if team.rankDelta > 0}
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="3"
                                            d="M5 15l7-7 7 7"
                                        />
                                    {:else}
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="3"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    {/if}
                                </svg>
                                <span class="font-mono text-[9px] font-bold"
                                    >{Math.abs(team.rankDelta)}</span
                                >
                            </div>
                        {/if}
                    </div>

                    <!-- ── TEAM ── -->
                    <div
                        class="sm:col-span-5 relative z-10 flex items-center gap-2 sm:gap-3 min-w-0"
                    >
                        <!-- Logo container -->
                        <div
                            class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center relative"
                        >
                            <!-- Subtle blue glow on hover, unified across all regions -->
                            <div
                                class="absolute inset-0 opacity-0 group-hover:opacity-15 blur-md transition-all duration-300 bg-[#085FFF]"
                            ></div>
                            {#if team.logo}
                                <img
                                    src={team.logoDark || team.logo}
                                    alt={team.name}
                                    class="w-full h-full object-contain relative z-10 transition-all duration-300"
                                />
                            {:else}
                                <span
                                    class="font-title text-base text-white/30"
                                >
                                    {team.name.substring(0, 2).toUpperCase()}
                                </span>
                            {/if}
                        </div>

                        <div class="flex flex-col min-w-0">
                            <div class="flex items-center gap-2">
                                <span
                                    class="font-title uppercase text-base sm:text-lg leading-tight truncate transition-colors
                                    {isTop3
                                        ? 'text-white'
                                        : 'text-white/60 group-hover:text-white'}"
                                >
                                    {team.name}
                                </span>
                                <!-- Calibration dot: few matches played, still settling -->
                                {#if team.wins + team.losses < 6}
                                    <span
                                        class="w-1.5 h-1.5 rounded-full bg-[#085FFF] animate-pulse shrink-0"
                                    ></span>
                                {/if}
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span
                                    class="font-mono text-[10px] uppercase tracking-widest text-white/35 opacity-50"
                                >
                                    {team.region}
                                </span>
                                {#if team.isPartner}
                                    <svg
                                        class="w-3.5 h-3.5 shrink-0 text-[#085FFF] opacity-60"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        title="OWCS Partner Team"
                                    >
                                        <path
                                            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.44 3.814 3.745 3.745 0 01-3.814.44A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.153-1.593 3.745 3.745 0 01-3.814-.44 3.745 3.745 0 01-.44-3.814A3.745 3.745 0 013 12a3.745 3.745 0 011.593-3.153 3.745 3.745 0 01.44-3.814 3.745 3.745 0 013.814-.44A3.742 3.742 0 0112 3a3.745 3.745 0 013.153 1.593 3.745 3.745 0 013.814.44 3.745 3.745 0 01.44 3.814A3.745 3.745 0 0121 12z"
                                        />
                                    </svg>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- ── RATING ── -->
                    <div
                        class="sm:col-span-2 text-right sm:text-center relative z-10"
                    >
                        <span
                            class="font-mono font-black text-lg sm:text-xl tabular-nums transition-colors
                            {isTop3
                                ? 'text-white'
                                : 'text-white/40 group-hover:text-white/80'}"
                        >
                            {Math.round(team.rating)}
                        </span>
                    </div>

                    <!-- ── RECORD ── -->
                    <div
                        class="col-span-2 text-center relative z-10 hidden sm:block"
                    >
                        <span class="font-mono text-sm tabular-nums">
                            <span class="text-white/70">{team.wins}W</span>
                            <span class="text-white/20 mx-1">—</span>
                            <span class="text-white/30">{team.losses}L</span>
                        </span>
                    </div>

                    <!-- ── FORM ── -->
                    <div
                        class="col-span-2 relative z-10 hidden sm:flex items-center justify-center gap-1"
                    >
                        {#if team.form?.length > 0}
                            {#each team.form.slice(-5) as result}
                                <div
                                    class="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold border transition-all
                                    {result === 'W'
                                        ? 'bg-[rgba(0,217,133,0.08)] border-[rgba(0,217,133,0.25)] text-[#0CD905]'
                                        : 'bg-[rgba(217,0,0,0.08)] border-[rgba(217,0,0,0.25)] text-[#D90000]'}"
                                >
                                    {result}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div
            class="flex items-center justify-center h-32 text-white/20 font-mono text-xs uppercase tracking-widest"
        >
            No teams found
        </div>
    {/if}

    <!-- ── SHOW MORE ── -->
    {#if allFiltered.length > PREVIEW_ROWS}
        <div class="mt-4 flex justify-center">
            <button
                on:click={() => (showAll = !showAll)}
                class="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10
                hover:border-[#085FFF] hover:text-[#085FFF] text-white/30
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
                    Show All {allFiltered.length} Teams
                {/if}
            </button>
        </div>
    {/if}
</div>

<!-- ── ELO GRAPH MODAL ── -->
{#if selectedTeam}
    <div use:teleport>
        <div transition:fade={{ duration: 200 }} class="modal-root">
            <ELOGraph
                team={selectedTeam}
                isOpen={!!selectedTeam}
                onClose={() => (selectedTeam = null)}
                {matches}
            />
        </div>
    </div>
{/if}
