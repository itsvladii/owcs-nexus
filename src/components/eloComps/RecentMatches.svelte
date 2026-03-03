<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Match {
    id: string;
    date: string;
    tournament: string;
    team_a: string;
    team_b: string;
    score_a: number;
    score_b: number;
    elo_change_a: number;
    elo_change_b: number;
  }

  interface TeamInfo { logo?: string; }

  export let matches: Match[] = [];
  export let teamInfo: Record<string, TeamInfo> = {};

  $: recent = [...matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  let currentIndex = 0;
  let animating = false; // true while the slide-up transition is playing
  let interval: ReturnType<typeof setInterval>;

  // Every 3s: trigger the slide-up animation, then advance the index
  onMount(() => {
    if (recent.length <= 1) return;
    interval = setInterval(() => {
      animating = true;
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % recent.length;
        animating = false;
      }, 400); // matches the CSS transition duration
    }, 3000);
  });

  onDestroy(() => clearInterval(interval));

  function shortenTournament(name: string): string {
    return name
      .replace(/Overwatch Champions Series/g, 'OWCS')
      .replace(/ 20(\d\d)/g, " '$1")
      .replace(/Stage (\d)/g, 'S$1')
      .replace(/Season (\d)/g, 'S$1')
      .replace(/North America/g, 'NA')
      .replace(/South Korea/g, 'Korea')
      .trim();
  }

  function getTeam(name: string): TeamInfo {
    return teamInfo[name?.toLowerCase()] ?? {};
  }

  function eloLabel(change: number): string {
    const r = Math.round(change);
    return r > 0 ? `+${r}` : `${r}`;
  }

  $: current = recent[currentIndex];
  $: next    = recent[(currentIndex + 1) % recent.length];
</script>

{#if recent.length > 0}
<div class="w-full border-t border-b border-neutral-800 bg-neutral-950/60 backdrop-blur-sm mb-12" style="height:72px; overflow:hidden;">
  <div class="flex items-stretch h-full">

    <!-- Left label — static -->
    <div class="flex items-center gap-3 px-4 border-r border-neutral-800 shrink-0">
      <span class="w-2 h-2 rounded-full bg-neutral-500 animate-pulse"></span>
      <span class="text-xs font-mono text-neutral-400 uppercase tracking-[0.3em] whitespace-nowrap hidden sm:inline">Recent Results</span>
      <span class="text-xs font-mono text-neutral-400 uppercase tracking-[0.3em] whitespace-nowrap sm:hidden">Results</span>
    </div>

    <!-- Sliding window — clips to one row height -->
    <div class="flex-1 relative overflow-hidden">
      <!--
        Two rows stacked: current on top, next below.
        When animating=true both slide up by 100% (44px),
        revealing the next match. Once the JS swaps the index,
        animating snaps back to false and we reset position instantly.
      -->
      <div
        class="flex flex-col transition-transform"
        style="
          height: 144px;
          transform: translateY({animating ? '-50%' : '0%'});
          transition-duration: {animating ? '400ms' : '0ms'};
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        "
      >
        <!-- Current match -->
        {#each [current, next] as match}
          {@const teamA = getTeam(match?.team_a ?? '')}
          {@const teamB = getTeam(match?.team_b ?? '')}
          {@const aWon  = (match?.score_a ?? 0) > (match?.score_b ?? 0)}

          <div class="flex items-center gap-3 md:gap-4 px-3 md:px-5 shrink-0" style="height:72px;">

            <!-- Tournament — desktop only -->
            <span class="text-xs font-mono text-neutral-400 uppercase tracking-wider whitespace-nowrap hidden md:inline">
              {shortenTournament(match?.tournament ?? '')}
            </span>
            <div class="w-px h-3 bg-neutral-800 hidden md:inline-block shrink-0"></div>

            <!-- Team A -->
            <div class="flex items-center gap-1.5 md:gap-2 min-w-0">
              {#if teamA.logo}
                <img src={teamA.logo} alt={match?.team_a} class="h-8 w-8 md:h-9 md:w-9 object-contain shrink-0 {aWon ? '' : 'opacity-25 grayscale'}" />
              {/if}
              <span class="font-title text-sm md:text-base  uppercase tracking-wide whitespace-nowrap {aWon ? 'text-white' : 'text-neutral-600'}">
                {match?.team_a}
              </span>
            </div>

            <!-- Score -->
            <div class="flex items-center gap-2 font-mono font-black text-base md:text-lg tabular-nums shrink-0 px-3 md:px-4 py-1.5 bg-neutral-900 border border-neutral-800 rounded">
              <span class="{aWon ? 'text-white' : 'text-neutral-500'}">{match?.score_a}</span>
              <span class="text-neutral-700">–</span>
              <span class="{!aWon ? 'text-white' : 'text-neutral-500'}">{match?.score_b}</span>
            </div>

            <!-- Team B -->
            <div class="flex items-center gap-1.5 md:gap-2 min-w-0">
              {#if teamB.logo}
                <img src={teamB.logo} alt={match?.team_b} class="h-8 w-8 md:h-9 md:w-9 object-contain shrink-0 {!aWon ? '' : 'opacity-25 grayscale'}" />
              {/if}
              <span class="font-title text-sm md:text-base uppercase tracking-wide whitespace-nowrap {!aWon ? 'text-white' : 'text-neutral-600'}">
                {match?.team_b}
              </span>
            </div>

            <!-- ELO change — hidden on smallest screens -->
            <span class="text-xs md:text-sm font-mono font-bold text-emerald-400 whitespace-nowrap ml-auto shrink-0 hidden sm:inline">
              {eloLabel(aWon ? (match?.elo_change_a ?? 0) : (match?.elo_change_b ?? 0))} pts
            </span>

          </div>
        {/each}
      </div>
    </div>

    <!-- Right: progress dots -->
    <div class="hidden sm:flex items-center gap-1 px-4 border-l border-neutral-800 shrink-0">
      {#each recent as _, i}
        <span class="rounded-full transition-all duration-300 {i === currentIndex ? 'w-4 h-2 bg-neutral-300' : 'w-2 h-2 bg-neutral-700'}"></span>
      {/each}
    </div>

  </div>
</div>
{/if}