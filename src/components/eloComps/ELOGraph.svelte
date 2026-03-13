<script lang="ts">
    import { slide } from "svelte/transition";
    import { onMount } from "svelte";
    import ApexCharts from "apexcharts";

    let { team, isOpen, onClose, matches } = $props<{
        team: any;
        isOpen: boolean;
        onClose: () => void;
        matches: any[];
    }>();

    let chartElement = $state<HTMLElement>();
    let chartInstance: ApexCharts | null = null;
    let expandedMatchId = $state<string | null>(null);

    // LFP-aligned: Bleu Électrique as the unified chart signal color
    const CHART_COLOR = "#085FFF";

    // --- Data Transformation ---
    let chartPoints = $derived(
        team?.history
            ? [...team.history]
                  .sort(
                      (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime(),
                  )
                  .map((h, index) => ({
                      x: new Date(
                          new Date(h.date).getTime() + index * 60000,
                      ).getTime(),
                      y: Math.round(h.elo),
                  }))
            : [],
    );

    let teamHistory = $derived(
        matches
            ? matches
                  .filter(
                      (m) => m.team_a === team.name || m.team_b === team.name,
                  )
                  .sort(
                      (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime(),
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
                    type: "area",
                    height: "100%",
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: "easeinout",
                        speed: 1000,
                        animateGradually: { enabled: true, delay: 150 },
                        dynamicAnimation: { enabled: true, speed: 350 },
                    },
                    fontFamily: "ui-monospace, monospace",
                    background: "transparent",
                    sparkline: { enabled: false },
                },
                dataLabels: { enabled: false },
                series: [{ name: "Rating", data: chartPoints }],
                stroke: {
                    curve: "smooth",
                    colors: [CHART_COLOR],
                    width: 2,
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.25,
                        opacityTo: 0,
                        stops: [0, 90, 100],
                        colorStops: [
                            { offset: 0, color: CHART_COLOR, opacity: 0.25 },
                            { offset: 100, color: CHART_COLOR, opacity: 0 },
                        ],
                    },
                },
                xaxis: {
                    type: "datetime",
                    labels: {
                        show: true,
                        style: {
                            colors: "rgba(255,255,255,0.2)",
                            fontSize: "10px",
                        },
                        datetimeUTC: false,
                        format: "dd MMM",
                    },
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: "rgba(255,255,255,0.2)",
                            fontSize: "10px",
                        },
                    },
                    tickAmount: 4,
                    forceNiceScale: true,
                },
                grid: {
                    borderColor: "rgba(255,255,255,0.04)",
                    xaxis: { lines: { show: true } },
                    padding: { left: 10, right: 10, top: 10, bottom: 0 },
                },
                theme: { mode: "dark" },
                tooltip: {
                    theme: "dark",
                    x: { format: "dd MMM yyyy hh:mm" },
                    y: { formatter: (val: number) => `${val} ELO` },
                },
                markers: {
                    size: 3,
                    colors: [CHART_COLOR],
                    strokeColors: CHART_COLOR,
                    strokeWidth: 0,
                    hover: {
                        size: 5,
                        colors: [CHART_COLOR],
                        strokeColors: CHART_COLOR,
                    },
                },
            };

            if (!chartInstance) {
                chartInstance = new ApexCharts(chartElement, options);
                chartInstance.render().then(() => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            chartInstance?.updateOptions({
                                chart: { width: "100%" },
                            });
                        });
                    });
                });
            } else {
                chartInstance.updateOptions(options);
            }
        }

        let resizeObserver: ResizeObserver | null = null;
        if (chartElement) {
            resizeObserver = new ResizeObserver(() => {
                chartInstance?.updateOptions({ chart: { width: "100%" } });
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

    // Body scroll lock
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
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/90 backdrop-blur-md"
            onclick={onClose}
        ></div>

        <!-- Modal shell — sharp corners, LFP block aesthetic -->
        <div
            class="relative w-full max-w-5xl bg-[#0d0d0d] border border-white/8 flex flex-col h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl"
        >
            <!-- ── HEADER ── -->
            <div
                class="pl-8 pr-5 py-5 sm:px-10 sm:py-6 border-b border-white/5 flex justify-between items-center relative z-10"
            >
                <div class="flex items-center gap-4 sm:gap-6">
                    {#if team.logo}
                        <img
                            src={team.logo}
                            alt=""
                            class="w-10 h-10 sm:w-14 sm:h-14 object-contain opacity-90"
                        />
                    {/if}
                    <div>
                        <h2
                            class="text-2xl sm:text-4xl font-black text-white uppercase leading-none font-title tracking-tight"
                        >
                            {team.name}
                        </h2>
                        <!-- Stats row -->
                        <div class="flex gap-5 sm:gap-8 mt-3 font-mono">
                            <div class="flex flex-col">
                                <span
                                    class="text-[9px] text-white/20 uppercase tracking-widest"
                                    >Rating</span
                                >
                                <!-- Current rating: Bleu Électrique — signal/identity color -->
                                <span
                                    class="text-xl text-[#085FFF] font-black tabular-nums leading-tight"
                                >
                                    {Math.round(team.rating)}
                                </span>
                            </div>
                            <div
                                class="flex flex-col border-l border-white/8 pl-5"
                            >
                                <span
                                    class="text-[9px] text-white/20 uppercase tracking-widest"
                                    >Peak</span
                                >
                                <span
                                    class="text-xl text-white/80 font-black tabular-nums leading-tight"
                                >
                                    {Math.round(peakRating)}
                                </span>
                            </div>
                            <div
                                class="flex flex-col border-l border-white/8 pl-5"
                            >
                                <span
                                    class="text-[9px] text-white/20 uppercase tracking-widest"
                                    >Region</span
                                >
                                <span
                                    class="text-[11px] text-[#085FFF] opacity-70 font-mono uppercase tracking-widest mt-1"
                                >
                                    {team.region}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Close button -->
                <button
                    onclick={onClose}
                    class="text-white/25 hover:text-white/80 transition-colors p-2 font-mono text-sm"
                    >✕</button
                >
            </div>

            <!-- ── SCROLLABLE BODY ── -->
            <div class="flex-1 overflow-y-auto bg-[#0d0d0d] custom-scrollbar">
                <!-- Chart area -->
                <div
                    class="h-56 sm:h-72 w-full px-4 sm:px-6 pt-5 pb-3 border-b border-white/5"
                >
                    <div bind:this={chartElement} class="w-full h-full"></div>
                </div>

                <!-- Match history list -->
                <div class="p-4 sm:p-6 space-y-px">
                    <!-- Section label -->
                    <div
                        class="font-mono text-[10px] uppercase tracking-widest text-white/20 pb-3"
                    >
                        Match History
                    </div>

                    {#each [...teamHistory].reverse() as m (m.id)}
                        {@const isTeamA = m.team_a === team.name}
                        {@const change = Math.round(
                            isTeamA ? m.elo_change_a : m.elo_change_b,
                        )}
                        {@const isWin = change >= 0}

                        <div
                            class="border-b border-white/[0.04] overflow-hidden hover:bg-white/[0.02] transition-all"
                        >
                            <!-- Match summary row -->
                            <div
                                onclick={() =>
                                    m.details &&
                                    (expandedMatchId =
                                        expandedMatchId === m.id ? null : m.id)}
                                class="flex flex-col sm:grid sm:grid-cols-12 gap-3 px-3 py-3 items-center cursor-pointer"
                            >
                                <!-- W/L + tournament + date -->
                                <div
                                    class="flex items-center gap-3 sm:col-span-4 w-full"
                                >
                                    <!-- W/L chip — square, LFP functional palette -->
                                    <div
                                        class="w-8 h-7 flex items-center justify-center font-mono font-black text-[11px] border shrink-0
                    {isWin
                                            ? 'bg-[rgba(0,217,133,0.08)] border-[rgba(0,217,133,0.25)] text-[#0CD905]'
                                            : 'text-[#D90000] bg-[rgba(217,0,0,0.08)] border-[rgba(217,0,0,0.2)]'}"
                                    >
                                        {isWin ? "W" : "L"}
                                    </div>
                                    <div
                                        class="flex flex-col text-left min-w-0"
                                    >
                                        <span
                                            class="text-[10px] text-white/40 font-mono truncate"
                                        >
                                            {getSmartAbbreviation(m.tournament)}
                                        </span>
                                        <span
                                            class="text-[9px] text-white/20 font-mono uppercase tracking-tighter"
                                        >
                                            {new Date(
                                                m.date,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <!-- Opponent + score -->
                                <div
                                    class="flex justify-between sm:justify-start sm:col-span-6 w-full gap-6 items-center"
                                >
                                    <span
                                        class="text-white/80 font-bold text-sm truncate"
                                    >
                                        <span
                                            class="text-white/20 font-normal italic mr-2 text-xs"
                                            >VS</span
                                        >
                                        {isTeamA ? m.team_b : m.team_a}
                                    </span>
                                    <span
                                        class="font-mono text-white/40 text-sm tabular-nums shrink-0"
                                    >
                                        {isTeamA
                                            ? m.score_a
                                            : m.score_b}–{isTeamA
                                            ? m.score_b
                                            : m.score_a}
                                    </span>
                                </div>

                                <!-- ELO change -->
                                <div
                                    class="hidden sm:block sm:col-span-2 text-right font-mono font-black text-sm
                  {isWin ? 'text-[#0CD905]' : 'text-[#D90000]'}"
                                >
                                    {isWin ? "+" : ""}{change}
                                </div>
                            </div>

                            <!-- Expanded map breakdown -->
                            {#if expandedMatchId === m.id && m.details}
                                <div
                                    transition:slide
                                    class="bg-black/40 border-t border-white/5 p-4 sm:p-5 space-y-1.5"
                                >
                                    {#each m.details.maps as map}
                                        {@const isMapWin =
                                            (map.winner === "1" && isTeamA) ||
                                            (map.winner === "2" && !isTeamA)}
                                        <!-- Map card — sharp, no rounded -->
                                        <div
                                            class="flex items-center justify-between bg-white/[0.02] border border-white/5 px-4 py-3"
                                        >
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <!-- Win/loss indicator bar — sharp, LFP palette -->
                                                <div
                                                    class="w-[2px] h-5 shrink-0
                          {isMapWin ? 'bg-[#0CD905]' : 'bg-[#D90000]'}"
                                                ></div>
                                                <div class="flex flex-col">
                                                    <span
                                                        class="text-xs font-bold font-mono text-white/80 uppercase"
                                                    >
                                                        {map.name}
                                                    </span>
                                                    <span
                                                        class="text-[8px] text-white/20 font-mono uppercase tracking-widest"
                                                    >
                                                        {map.mode || "Map"}
                                                    </span>
                                                </div>
                                            </div>
                                            <span
                                                class="font-mono font-bold text-sm
                        {isMapWin ? 'text-[#0CD905]' : 'text-[#D90000]'}"
                                                >{map.score}</span
                                            >
                                        </div>
                                    {/each}
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
        width: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(8, 95, 255, 0.3);
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
</style>
