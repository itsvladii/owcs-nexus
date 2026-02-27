<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, draw, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let team: any;
  export let isOpen: boolean;
  export let onClose: () => void;
  export let matches: any[];

  let expandedMatchId: string | null = null;
  let hoveredPoint: any = null;

  const REGION_COLORS: Record<string, string> = {
    Korea: "#6eff18",
    "North America": "#823bf2",
    EMEA: "#54c4c4",
    Pacific: "#58cdff",
    China: "#f7c525",
    Japan: "#ec0201",
  };

  $: borderColor = REGION_COLORS[team?.region] || "#525252";

  // Reactive calculations (Replaces useMemo)
  $: teamHistory = matches
    ? matches
        .filter((m) => m.team_a === team.name || m.team_b === team.name)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  $: peakRating = team?.history
    ? Math.max(...team.history.map((h) => h.elo))
    : 0;

  $: sosRating = (() => {
    if (!teamHistory.length) return 0;
    const total = teamHistory.reduce((acc, m) => {
      const isTeamA = m.team_a === team.name;
      const opponentElo = isTeamA ? m.team_b_elo_after : m.team_a_elo_after;
      return acc + (opponentElo || 1200);
    }, 0);
    return Math.round(total / teamHistory.length);
  })();

  // SVG Graph Logic
  const width = 1000;
  const height = 300;
  const padding = 40;

  $: chartData = team?.history
    ? [...team.history].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
    : [];

  $: minElo = chartData.length
    ? Math.min(...chartData.map((h) => h.elo)) - 50
    : 0;
  $: maxElo = chartData.length
    ? Math.max(...chartData.map((h) => h.elo)) + 50
    : 100;

  $: points = chartData.map((h, i) => ({
    x: (i / (chartData.length - 1 || 1)) * (width - padding * 2) + padding,
    y:
      height -
      ((h.elo - minElo) / (maxElo - minElo || 1)) * (height - padding * 2) -
      padding,
    elo: Math.round(h.elo),
    date: h.date,
  }));

  $: pathData =
    points.length > 0
      ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
      : "";
  $: areaData =
    points.length > 0
      ? `${pathData} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`
      : "";

  $: yAxisTicks = [maxElo, minElo + (maxElo - minElo) / 2, minElo];

  // Map those ticks to SVG Y-coordinates
  $: yTicks = yAxisTicks.map((elo) => ({
    elo: Math.round(elo),
    y:
      ((maxElo - elo) / (maxElo - minElo || 1)) * (height - padding * 2) +
      padding,
  }));

  function handleMouseMove(event: MouseEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * width;
    hoveredPoint = points.reduce(
      (prev, curr) =>
        Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev,
      points[0],
    );
  }

  function getSmartAbbreviation(name: string): string {
    if (!name) return "";
    return name
      .replace(/Overwatch Champions Series/g, "OWCS")
      .replace(/North America/g, "NA")
      .replace(/Europe, Middle East and Africa/g, "EMEA")
      .replace(/China/g, "CN")
      .replace(/Japan/g, "JP")
      .replace(/Pacific/g, "PAC")
      .replace(/Open Qualifiers/g, "Qualifiers")
      .replace(/Korea/g, "KR")
      .trim();
  }

  onMount(() => {
    if (isOpen) document.body.style.overflow = "hidden";
  });
  onDestroy(() => {
    document.body.style.overflow = "unset";
  });
</script>

{#if isOpen && team}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
  >
    <div
      class="absolute inset-0 bg-black/90 backdrop-blur-md"
      on:click={onClose}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === "Enter" && onClose()}
    />

    <div
      class="relative w-full max-w-5xl bg-neutral-950 border border-white/10 rounded-2xl flex flex-col h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl"
    >
      <div
        class="px-5 py-5 sm:px-8 border-b border-white/5 bg-neutral-900/40 flex justify-between items-center relative z-10"
      >
        <div class="flex items-center gap-4 sm:gap-8">
          {#if team.logo}<img
              src={team.logo}
              alt=""
              class="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />{/if}
          <div>
            <h2
              class="text-2xl sm:text-4xl font-black text-white uppercase leading-none font-title"
            >
              {team.name}
            </h2>
            <div class="flex gap-4 sm:gap-6 mt-3 font-mono">
              <div class="flex flex-col">
                <span class="text-[8px] text-neutral-500 uppercase">Rating</span
                >
                <span class="text-lg text-emerald-400"
                  >{Math.round(team.rating)}</span
                >
              </div>
              <div class="flex flex-col border-l border-white/10 pl-4">
                <span class="text-[8px] text-neutral-500 uppercase">Peak</span>
                <span class="text-lg text-white">{Math.round(peakRating)}</span>
              </div>
              <div class="flex flex-col border-l border-white/10 pl-4">
                <span class="text-[8px] text-neutral-500 uppercase"
                  >Avg Opp</span
                >
                <span class="text-lg text-blue-400">{sosRating}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          on:click={onClose}
          class="text-neutral-400 hover:text-white p-2"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg
          >
        </button>
      </div>

      <div class="flex-1 overflow-y-auto bg-neutral-950 custom-scrollbar">
        <div
          class="h-48 sm:h-72 w-full p-4 sm:p-6 bg-neutral-900/20 border-b border-white/5 relative"
        >
          <svg
            viewBox="0 0 {width} {height}"
            class="w-full h-full overflow-visible cursor-crosshair"
            on:mousemove={handleMouseMove}
            on:mouseleave={() => (hoveredPoint = null)}
          >
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color={borderColor} stop-opacity="0.3" />
                <stop offset="100%" stop-color={borderColor} stop-opacity="0" />
              </linearGradient>

              <pattern
                id="gridPattern"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  stroke-opacity="0.03"
                  stroke-width="1"
                />
              </pattern>
            </defs>

            <rect
              x={padding}
              y={padding}
              width={width - padding * 2}
              height={height - padding * 2}
              fill="url(#gridPattern)"
            />

            {#each [0, 0.25, 0.5, 0.75, 1] as tick}
              {@const yPos = padding + (height - padding * 2) * tick}
              {@const eloVal = Math.round(maxElo - (maxElo - minElo) * tick)}
              <line
                x1={padding}
                y1={yPos}
                x2={width - padding}
                y2={yPos}
                stroke="white"
                stroke-opacity="0.05"
                stroke-width="1"
              />
              <text
                x={padding - 10}
                y={yPos + 4}
                text-anchor="end"
                fill="#525252"
                font-size="10"
                font-family="monospace">{eloVal}</text
              >
            {/each}

            <path d={areaData} fill="url(#lineGrad)" />
            <path
              d={pathData}
              fill="none"
              stroke={borderColor}
              stroke-width="3"
              stroke-linejoin="round"
              filter="drop-shadow(0px 0px 8px {borderColor}44)"
            />

            {#each points as p, i}
              {#if i === 0 || i === points.length - 1 || (points.length > 5 && i % Math.floor(points.length / 4) === 0)}
                <text
                  x={p.x}
                  y={height - 10}
                  text-anchor="middle"
                  fill="#525252"
                  font-size="10"
                  font-family="monospace"
                >
                  {new Date(p.date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </text>
              {/if}
            {/each}

            {#if hoveredPoint}
              <line
                x1={hoveredPoint.x}
                y1={padding}
                x2={hoveredPoint.x}
                y2={height - padding}
                stroke="white"
                stroke-width="1"
                stroke-dasharray="4"
                opacity="0.3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill={borderColor}
                stroke="white"
                stroke-width="2"
              />

              <g
                transform="translate({hoveredPoint.x > width - 150
                  ? hoveredPoint.x - 130
                  : hoveredPoint.x + 10}, {hoveredPoint.y - 40})"
              >
                <rect
                  width="120"
                  height="50"
                  rx="4"
                  fill="#0a0a0a"
                  stroke="white"
                  stroke-opacity="0.2"
                  shadow="0 10px 15px -3px rgb(0 0 0 / 0.1)"
                />
                <text
                  x="10"
                  y="22"
                  fill="white"
                  font-size="14"
                  font-weight="bold"
                  font-family="monospace">{hoveredPoint.elo} ELO</text
                >
                <text
                  x="10"
                  y="38"
                  fill="#737373"
                  font-size="9"
                  font-family="monospace"
                  text-transform="uppercase"
                  >{new Date(hoveredPoint.date).toLocaleDateString()}</text
                >
              </g>
            {/if}
          </svg>
        </div>

        <div class="p-4 sm:p-8 space-y-3">
          {#each [...teamHistory].reverse() as m (m.id)}
            {@const isTeamA = m.team_a === team.name}
            {@const change = Math.round(
              isTeamA ? m.elo_change_a : m.elo_change_b,
            )}
            {@const isWin = change >= 0}
            <div
              class="border border-white/5 bg-neutral-900/30 rounded-xl overflow-hidden hover:border-white/10 transition-all"
            >
              <div
                on:click={() =>
                  m.details &&
                  (expandedMatchId = expandedMatchId === m.id ? null : m.id)}
                class="flex flex-col sm:grid sm:grid-cols-12 gap-3 p-4 items-center cursor-pointer"
                role="button"
                tabindex="0"
                on:keydown={(e) =>
                  e.key === "Enter" &&
                  m.details &&
                  (expandedMatchId = expandedMatchId === m.id ? null : m.id)}
              >
                <div class="flex items-center gap-3 sm:col-span-4 w-full">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs {isWin
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-red-500 bg-red-500/10'} border"
                  >
                    {isWin ? "W" : "L"}
                  </div>
                  <div class="flex flex-col">
                    <span
                      class="text-[10px] text-neutral-400 font-mono truncate"
                      >{getSmartAbbreviation(m.tournament)}</span
                    >
                    <span
                      class="text-[9px] text-neutral-600 font-mono uppercase"
                      >{new Date(m.date).toLocaleDateString()}</span
                    >
                  </div>
                </div>
                <div
                  class="flex justify-between sm:justify-start sm:col-span-6 w-full gap-8"
                >
                  <span class="text-white font-bold text-sm truncate"
                    ><span class="text-neutral-600 font-normal italic mr-2"
                      >VS</span
                    >
                    {isTeamA ? m.team_b : m.team_a}</span
                  >
                  <span class="font-mono text-neutral-400"
                    >{isTeamA ? m.score_a : m.score_b} - {isTeamA
                      ? m.score_b
                      : m.score_a}</span
                  >
                </div>
                <div
                  class="hidden sm:block sm:col-span-2 text-right font-mono font-black {isWin
                    ? 'text-emerald-400'
                    : 'text-red-400'}"
                >
                  {isWin ? "+" : ""}{change}
                </div>
              </div>
              {#if expandedMatchId === m.id && m.details}
  <div transition:slide class="bg-black/60 border-t border-white/5 p-4 sm:p-5 space-y-4">
    
    {#if m.details.mvp}
      <div class="flex items-center gap-3 pb-3 border-b border-white/5">
        <span class="text-[8px] sm:text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded uppercase tracking-widest">Match MVP</span>
        <span class="text-xs font-mono text-white font-bold italic">{m.details.mvp}</span>
      </div>
    {/if}

    <div class="grid gap-2">
      {#each m.details.maps as map}
        {@const isMapWin = (map.winner === '1' && isTeamA) || (map.winner === '2' && !isTeamA)}
        
        <div class="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class={`w-1 h-6 rounded-full ${isMapWin ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <div class="flex flex-col">
                <span class="text-xs font-bold font-mono text-white uppercase">{map.name}</span>
                <span class="text-[8px] text-neutral-600 font-mono uppercase tracking-widest">{map.mode || 'Map'}</span>
              </div>
            </div>
            <span class={`font-mono font-bold text-sm ${isMapWin ? 'text-emerald-400' : 'text-red-400'}`}>
              {map.score}
            </span>
          </div>

          {#if map.bans && map.bans.length > 0}
            <div class="flex flex-wrap gap-1.5 items-center pt-1 border-t border-white/5">
              <span class="text-[8px] text-neutral-700 font-mono font-bold uppercase mr-1">Bans:</span>
              {#each map.bans as ban}
                <span class="text-[10px] font-mono text-red-400/60 bg-red-400/5 px-1 rounded border border-red-400/10">
                  {ban}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #262626;
    border-radius: 10px;
  }
</style>
