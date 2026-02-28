<script lang="ts">
  import { slide } from "svelte/transition";
  import { onMount } from "svelte";
  import ApexCharts from "apexcharts";

  // --- Svelte 5 Props ---
  let { team, isOpen, onClose, matches } = $props<{
    team: any;
    isOpen: boolean;
    onClose: () => void;
    matches: any[];
  }>();

  let chartElement = $state<HTMLElement>();
  let chartInstance: ApexCharts | null = null;
  let expandedMatchId = $state<string | null>(null);

  const REGION_COLORS: Record<string, string> = {
    Korea: "#6eff18",
    "North America": "#823bf2",
    EMEA: "#54c4c4",
    Pacific: "#58cdff",
    China: "#f7c525",
    Japan: "#ec0201",
  };

  let borderColor = $derived(REGION_COLORS[team?.region]);

  // --- Data Transformation ---
  // Spreading out matches on the same day with a 1-minute offset
  let chartPoints = $derived(
    team?.history
      ? [...team.history]
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
          .map((h, index) => ({
            x: new Date(new Date(h.date).getTime() + index * 60000).getTime(),
            y: Math.round(h.elo),
          }))
      : [],
  );

  let teamHistory = $derived(
    matches
      ? matches
          .filter((m) => m.team_a === team.name || m.team_b === team.name)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
      : [],
  );

  let peakRating = $derived(
    team?.history ? Math.max(...team.history.map((h: any) => h.elo)) : 0,
  );

  $effect(() => {
    if (chartElement && chartPoints.length > 0) {
      const options = {
  chart: {
    type: 'area',
    height: '100%',
    toolbar: { show: false },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 1000,
      // This forces the "drawing" effect from left to right
      animateGradually: {
        enabled: true,
        delay: 150
      },
      dynamicAnimation: {
        enabled: true,
        speed: 350
      }
    },
    fontFamily: 'ui-monospace, monospace',
    background: 'transparent',
    sparkline: { enabled: false }
  },
  dataLabels: { enabled: false },
  series: [{ name: 'Rating', data: chartPoints }],
  stroke: { 
    curve: 'smooth', 
    colors: [borderColor], 
    width: 3 
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0,
      stops: [0, 90, 100],
      colorStops: [
        { offset: 0, color: borderColor, opacity: 0.4 },
        { offset: 100, color: borderColor, opacity: 0 }
      ]
    }
  },
xaxis: {
  type: 'datetime',
  labels: { 
    show: true, 
    style: { colors: '#525252', fontSize: '10px' },
    datetimeUTC: false,
    format: 'dd MMM' 
  },
  axisBorder: { show: false },
  axisTicks: { show: false }
},
  yaxis: {
    labels: { style: { colors: '#525252', fontSize: '10px' } },
    tickAmount: 4,
    forceNiceScale: true,
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.05)',
    xaxis: { lines: { show: true } },
    padding: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 0
    }
  },
  theme: { mode: 'dark' },
  tooltip: {
    theme: 'dark',
    x: { format: 'dd MMM yyyy hh:mm' },
    y: { formatter: (val: number) => `${val} ELO` }
  },
    markers: { size: 4, colors: [borderColor], strokeColors: borderColor, strokeWidth: 0, hover: { size: 6, colors: [borderColor], strokeColors: borderColor } }
};

      if (!chartInstance) {
        chartInstance = new ApexCharts(chartElement, options);
        chartInstance.render().then(() => {
          // After the modal CSS transition settles, force a resize so the
          // chart fills the container correctly without needing a user interaction.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              chartInstance?.updateOptions({ chart: { width: '100%' } });
            });
          });
        });
      } else {
        chartInstance.updateOptions(options);
      }
    }

    // Use a ResizeObserver so any late layout shifts (e.g. scrollbar appearing)
    // are automatically corrected.
    let resizeObserver: ResizeObserver | null = null;
    if (chartElement) {
      resizeObserver = new ResizeObserver(() => {
        chartInstance?.updateOptions({ chart: { width: '100%' } });
      });
      resizeObserver.observe(chartElement);
    }

    return () => {
      resizeObserver?.disconnect();
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
    };
  });

  // Body Scroll Lock
  $effect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  });

  function getSmartAbbreviation(name: string): string {
    if (!name) return "";
    return name
      .replace(/Overwatch Champions Series/g, "OWCS")
      .replace(/Korea/g, "KR")
      .replace(/North America/g, "NA")
      .trim();
  }
</script>

{#if isOpen && team}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
  >
    <div
      class="absolute inset-0 bg-black/90 backdrop-blur-md"
      onclick={onClose}
    ></div>

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
                <span class="text-lg text-emerald-400 font-bold"
                  >{Math.round(team.rating)}</span
                >
              </div>
              <div class="flex flex-col border-l border-white/10 pl-4">
                <span class="text-[8px] text-neutral-500 uppercase">Peak</span>
                <span class="text-lg text-white">{Math.round(peakRating)}</span>
              </div>
            </div>
          </div>
        </div>
        <button onclick={onClose} class="text-neutral-400 hover:text-white p-2"
          >✕</button
        >
      </div>

      <div class="flex-1 overflow-y-auto bg-neutral-950 custom-scrollbar">
        <div
          class="h-64 sm:h-80 w-full p-4 sm:p-6 bg-neutral-900/20 border-b border-white/5"
        >
          <div bind:this={chartElement} class="w-full h-full"></div>
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
                onclick={() =>
                  m.details &&
                  (expandedMatchId = expandedMatchId === m.id ? null : m.id)}
                class="flex flex-col sm:grid sm:grid-cols-12 gap-3 p-4 items-center cursor-pointer"
              >
                <div class="flex items-center gap-3 sm:col-span-4 w-full">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs {isWin
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-red-500 bg-red-500/10'} border"
                  >
                    {isWin ? "W" : "L"}
                  </div>
                  <div class="flex flex-col text-left">
                    <span
                      class="text-[10px] text-neutral-400 font-mono truncate"
                      >{getSmartAbbreviation(m.tournament)}</span
                    >
                    <span
                      class="text-[9px] text-neutral-600 font-mono uppercase tracking-tighter"
                      >{new Date(m.date).toLocaleDateString()}</span
                    >
                  </div>
                </div>
                <div
                  class="flex justify-between sm:justify-start sm:col-span-6 w-full gap-8"
                >
                  <span class="text-white font-bold text-sm truncate">
                    <span
                      class="text-neutral-600 font-normal italic mr-2 text-xs"
                      >VS</span
                    >
                    {isTeamA ? m.team_b : m.team_a}
                  </span>
                  <span class="font-mono text-neutral-400 text-sm">
                    {isTeamA ? m.score_a : m.score_b} - {isTeamA
                      ? m.score_b
                      : m.score_a}
                  </span>
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
                <div
                  transition:slide
                  class="bg-black/60 border-t border-white/5 p-4 sm:p-5 space-y-4"
                >
                  <div class="grid gap-2 text-left">
                    {#each m.details.maps as map}
                      {@const isMapWin =
                        (map.winner === "1" && isTeamA) ||
                        (map.winner === "2" && !isTeamA)}
                      <div
                        class="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/5"
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <div
                              class="w-1 h-6 rounded-full {isMapWin
                                ? 'bg-emerald-500'
                                : 'bg-red-500'}"
                            ></div>
                            <div class="flex flex-col">
                              <span
                                class="text-xs font-bold font-mono text-white uppercase"
                                >{map.name}</span
                              >
                              <span
                                class="text-[8px] text-neutral-600 font-mono uppercase tracking-widest"
                                >{map.mode || "Map"}</span
                              >
                            </div>
                          </div>
                          <span
                            class="font-mono font-bold text-sm {isMapWin
                              ? 'text-emerald-400'
                              : 'text-red-400'}">{map.score}</span
                          >
                        </div>
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