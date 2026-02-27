<script lang="ts">
  import ELOGraph from './ELOGraph.svelte';
  import { fade, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  export let teams: any[] = [];
  export let matches: any[] = [];

  let selectedTeam: any = null;
  let regionFilter = 'All Regions';

  const REGION_FILTERS = ['All Regions', 'Korea', 'North America', 'EMEA', 'China', 'Pacific', 'Japan'];
  const REGION_COLORS: Record<string, string> = {
    "Korea": "#6eff18",
    "North America": "#823bf2",
    "EMEA": "#54c4c4",
    "Pacific": "#58cdff",
    "China": "#f7c525",
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
    };
  }
</script>

<div class="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm relative z-10">

  <div class="p-4 border-b border-neutral-800 bg-neutral-950/50 flex flex-wrap gap-4 items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="relative">
        <select
          bind:value={regionFilter}
          class="appearance-none bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg pl-4 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
        >
          {#each REGION_FILTERS as r}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>
    </div>
    <span class="text-xs text-neutral-500 font-mono">
      Showing {filteredTeams.length} Teams
    </span>
  </div>

  <div class="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 bg-neutral-950/80 text-neutral-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
    <div class="col-span-2 sm:col-span-1 text-center">Rank</div>
    <div class="col-span-7 sm:col-span-5">Team</div>
    <div class="col-span-3 sm:col-span-2 text-center">Rating</div>
    <div class="col-span-2 hidden sm:block text-center">Record</div>
    <div class="col-span-2 hidden sm:block text-center">Form</div>
  </div>

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
          {#if team.rankDelta && team.rankDelta !== 0}
            <div class="text-[10px] font-bold mt-1 {team.rankDelta > 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-0.5">
              {Math.abs(team.rankDelta)}
            </div>
          {/if}
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
            <span class="text-xl font-bold font-title truncate leading-tight {team.isPartner ? 'text-white' : 'text-neutral-300'}">
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

        <div class="col-span-3 sm:col-span-2 text-center font-mono font-bold text-neutral-300 group-hover:text-amber-400">
          {Math.round(team.rating)}
        </div>
        <div class="col-span-2 hidden sm:block text-center text-neutral-500 text-sm font-mono">
          {team.wins}W - {team.losses}L
        </div>
        <div class="col-span-2 hidden sm:flex items-center justify-center gap-1.5">
          {#if team.form && team.form.length > 0}
            {#each team.form.slice(-5) as result}
              <div class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border 
                {result === 'W' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}">
                {result}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  {:else}
    <div class="p-12 text-center text-neutral-500">No teams found.</div>
  {/if}
</div>

{#if selectedTeam}
  <div use:teleport>
    <div transition:fade={{ duration: 200 }} class="modal-root">
      <ELOGraph
        team={selectedTeam}
        isOpen={!!selectedTeam}
        onClose={() => selectedTeam = null}
        matches={matches}
      />
    </div>
  </div>
{/if}