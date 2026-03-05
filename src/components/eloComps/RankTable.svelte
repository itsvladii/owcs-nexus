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

<<<<<<< HEAD
  const REGION_FILTERS = ['All Regions', 'Korea', 'North America', 'EMEA', 'China', 'Pacific', 'Japan'];
  const REGION_COLORS: Record<string, string> = {
    "Korea": "#6eff18",
    "North America": "#823bf2",
    "EMEA": "#d4e800",
    "Pacific": "#00c8ff",
    "China": "#ff6a00",
    "Japan": "#ec0201",
  };

  $: filteredTeams = teams.filter(team => {
    if (regionFilter !== 'All Regions' && team.region !== regionFilter) {
      return false;
    }
    return true;
  });

  function getBorderColor(region: string, isPartner: boolean) {
    const color = REGION_COLORS[region] || "#525252";
    return isPartner ? `4px solid ${color}99` : `4px solid transparent`;
  }

  function teleport(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
=======
    const REGION_FILTERS = [
        "All Regions",
        "Korea",
        "North America",
        "EMEA",
        "China",
        "Pacific",
        "Japan",
    ];
    const REGION_COLORS: Record<string, string> = {
        Korea: "#6eff18",
        "North America": "#823bf2",
        EMEA: "#d4e800",
        Pacific: "#58cdff",
        China: "#f7c525",
        Japan: "#ec0201",
>>>>>>> dev
    };

    $: allFiltered = teams.filter(
        (t) => regionFilter === "All Regions" || t.region === regionFilter,
    );
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

    function regionColor(region: string): string {
        return REGION_COLORS[region] ?? "#525252";
    }
</script>

<div class="relative">
    <!-- ── REGION FILTER PILLS ── -->
    <div class="flex flex-wrap items-center gap-2 mb-6 pt-4 pl-5">
        {#each REGION_FILTERS as r}
            <button
                on:click={() => (regionFilter = r)}
                class="px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border transition-all
          {regionFilter === r
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}"
            >
                {r === "All Regions" ? "All" : r}
            </button>
        {/each}
    </div>

    <!-- ── TABLE HEADER ── -->
    <div
        class="grid grid-cols-12 gap-4 px-4 pb-2 text-neutral-600 font-mono text-[10px] uppercase tracking-widest border-b border-neutral-800 mb-1"
    >
        <div class="col-span-1 text-center">#</div>
        <div class="col-span-5">Team</div>
        <div class="col-span-2 text-center">Rating</div>
        <div class="col-span-2 text-center hidden sm:block">Record</div>
        <div class="col-span-2 text-center hidden sm:block">Form</div>
    </div>

<<<<<<< HEAD
  {#if filteredTeams.length > 0}
    {#each filteredTeams as team (team.name)}
      <div
        animate:flip={{ duration: 400 }}
        on:click={() => selectedTeam = team}
        on:keydown={(e) => e.key === 'Enter' && (selectedTeam = team)}
        role="button"
        tabindex="0"
        class="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 items-center transition-all cursor-pointer group relative {team.isPartner ? 'bg-neutral-800/10' : 'hover:bg-neutral-800/50'}"
        style="border-left: {getBorderColor(team.region, team.isPartner)}"
      >
        <div class="col-span-2 sm:col-span-1 text-center flex flex-col items-center justify-center">
          <span class="font-title text-3xl group-hover:scale-110 transition-transform leading-none 
            {team.rank === 1 ? 'text-amber-400' : team.rank === 2 ? 'text-gray-300' : team.rank === 3 ? 'text-orange-700' : 'text-neutral-500'}">
            #{team.rank}
          </span>
          
            <div class="flex items-center gap-0.5 mt-1 text-[10px] font-bold {team.rankDelta > 0 ? 'text-green-500' : 'text-red-500'}">
            {#if team.rankDelta && team.rankDelta !== 0}
              <span>{team.rankDelta > 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(team.rankDelta)}</span>
            {/if}
            </div>
          
        </div>

        <div class="col-span-7 sm:col-span-5 flex items-center gap-4">
          <div class="w-10 h-10 items-center justify-center p-1 shadow-inner flex-shrink-0">
            {#if team.logo}
              <img src={team.logo} alt={team.name} class="w-full h-full object-contain" />
            {:else}
              <span class="text-neutral-400 font-bold text-xs">{team.name.substring(0, 2).toUpperCase()}</span>
            {/if}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xl font-title truncate leading-tight {team.isPartner ? 'text-white' : 'text-neutral-300'}">
              {team.name}
            </span>
            <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
              {team.region}
            </span>
          </div>
          {#if (team.wins + team.losses) < 10}
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          {/if}
        </div>
=======
    <!-- ── ROWS ── -->
    {#if filteredTeams.length > 0}
        <div class="flex flex-col gap-0.5">
            {#each filteredTeams as team (team.name)}
                {@const color = regionColor(team.region)}
                {@const isTop3 = team.rank <= 3}

                <div
                    animate:flip={{ duration: 400 }}
                    on:click={() => (selectedTeam = team)}
                    on:keydown={(e) =>
                        e.key === "Enter" && (selectedTeam = team)}
                    role="button"
                    tabindex="0"
                    class="group grid grid-cols-12 gap-4 px-4 py-3 rounded-xl items-center
            cursor-pointer transition-all relative overflow-hidden
            border border-transparent hover:border-neutral-800
            {team.isPartner
                        ? 'bg-neutral-900/80'
                        : 'bg-neutral-900/30 hover:bg-neutral-900/80'}"
                >
                    <!-- Region color left accent bar -->
                    <div
                        class="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-50 transition-opacity group-hover:opacity-100"
                    ></div>
>>>>>>> dev

                    <!-- Subtle top-3 background glow -->
                    {#if isTop3}
                        <div
                            class="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none"
                            style="background: {team.rank === 1
                                ? '#f59e0b'
                                : team.rank === 2
                                  ? '#9ca3af'
                                  : '#b45309'}"
                        ></div>
                    {/if}

                    <!-- ── RANK ── -->
                    <div
                        class="col-span-1 text-center relative z-10 flex flex-col items-center gap-0.5"
                    >
                        <span
                            class="font-title leading-none transition-transform group-hover:scale-110
              {team.rank === 1
                                ? 'text-amber-400 text-3xl'
                                : team.rank === 2
                                  ? 'text-neutral-400 text-2xl'
                                  : team.rank === 3
                                    ? 'text-orange-600 text-2xl'
                                    : 'text-neutral-600 text-xl'}"
                        >
                            #{team.rank}
                        </span>
                        {#if team.rankDelta && team.rankDelta !== 0}
                            <div
                                class="flex items-center gap-0.5 {team.rankDelta >
                                0
                                    ? 'text-emerald-500'
                                    : 'text-red-500'}"
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
                        class="col-span-5 relative z-10 flex items-center gap-3"
                    >
                        <div
                            class="w-11 h-11 shrink-0 flex items-center justify-center relative"
                        >
                            <div
                                class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-all duration-300"
                                style="background: {color}"
                            ></div>
                            {#if team.logo}
                                <img
                                    src={team.logoDark || team.logo}
                                    alt={team.name}
                                    class="w-full h-full object-contain relative z-10 transition-all duration-300"
                                />
                            {:else}
                                <span
                                    class="font-title text-sm text-neutral-500"
                                >
                                    {team.name.substring(0, 2).toUpperCase()}
                                </span>
                            {/if}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <div class="flex items-center gap-2">
                                <span
                                    class="font-title uppercase text-lg leading-tight truncate transition-colors
                  {team.isPartner
                                        ? 'text-white'
                                        : 'text-neutral-300 group-hover:text-white'}"
                                >
                                    {team.name}
                                </span>
                                {#if team.wins + team.losses < 10}
                                    <span
                                        class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0"
                                    ></span>
                                {/if}
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span
                                    class="font-mono text-[10px] uppercase tracking-widest"
                                    style="color: {color}99"
                                >
                                    {team.region}
                                </span>
                                {#if team.isPartner}
                                    <svg
                                        class="w-3.5 h-3.5 shrink-0"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        style="color: {color}88"
                                        title="Official OWCS Partner"
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
                    <div class="col-span-2 text-center relative z-10">
                        <span
                            class="font-mono font-black text-xl tabular-nums transition-colors
              {isTop3
                                ? 'text-white'
                                : 'text-neutral-400 group-hover:text-white'}"
                        >
                            {Math.round(team.rating)}
                        </span>
                    </div>

                    <!-- ── RECORD ── -->
                    <div
                        class="col-span-2 text-center relative z-10 hidden sm:block"
                    >
                        <span class="font-mono text-sm tabular-nums">
                            <span class="text-neutral-300">{team.wins}W</span>
                            <span class="text-neutral-700 mx-1">—</span>
                            <span class="text-neutral-500">{team.losses}L</span>
                        </span>
                    </div>

                    <!-- ── FORM ── -->
                    <div
                        class="col-span-2 relative z-10 hidden sm:flex items-center justify-center gap-1"
                    >
                        {#if team.form?.length > 0}
                            {#each team.form.slice(-5) as result}
                                <div
                                    class="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border transition-all
                  {result === 'W'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-red-500/10 border-red-500/30 text-red-500'}"
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
            class="flex items-center justify-center h-32 text-neutral-600 font-mono text-xs uppercase tracking-widest"
        >
            No teams found
        </div>
    {/if}

    <!-- ── SHOW MORE ── -->
    {#if allFiltered.length > PREVIEW_ROWS}
        <div class="mt-3 flex justify-center">
            <button
                on:click={() => (showAll = !showAll)}
                class="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 border border-neutral-800
          hover:border-neutral-600 text-neutral-500 hover:text-neutral-300
          font-mono text-[10px] uppercase tracking-widest rounded-lg transition-all"
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
