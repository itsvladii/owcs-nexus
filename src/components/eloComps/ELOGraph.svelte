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

    // Cloudinary hero icon base — filenames are lowercase, no spaces or special chars
    const HERO_BASE =
        "https://res.cloudinary.com/dm1bfprgq/image/upload/v1772646686";

    function heroIconUrl(hero: string): string {
        if (!hero) return "";
        // Normalize accents (é→e, ö→o etc.) then strip all non-alphanumeric
        const slug = hero
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "") // strip accent marks
            .replace(/[^a-z0-9]/g, ""); // strip spaces, dots, colons etc.
        return `${HERO_BASE}/${slug}.png`;
    }

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
                      y: Math.round(h.gpr),
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
        team?.history ? Math.max(...team.history.map((h: any) => h.gpr)) : 0,
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
                stroke: { curve: "smooth", colors: [CHART_COLOR], width: 2 },
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
                    y: { formatter: (val: number) => `${val} GPR` },
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

        <!-- Modal shell -->
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
                        <div class="flex gap-5 sm:gap-8 mt-3 font-mono">
                            <div class="flex flex-col">
                                <span
                                    class="text-[9px] text-white/20 uppercase tracking-widest"
                                    >GPR</span
                                >
                                <span
                                    class="text-xl text-[#085FFF] font-black tabular-nums leading-tight"
                                    >{Math.round(team.gpr)}</span
                                >
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
                                    >{Math.round(peakRating)}</span
                                >
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
                                    >{team.region}</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onclick={onClose}
                    class="text-white/25 hover:text-white/80 transition-colors p-2 font-mono text-sm"
                    >✕</button
                >
            </div>

            <!-- ── SCROLLABLE BODY ── -->
            <div class="flex-1 overflow-y-auto bg-[#0d0d0d] custom-scrollbar">
                <!-- Chart -->
                <div
                    class="h-56 sm:h-72 w-full px-4 sm:px-6 pt-5 pb-3 border-b border-white/5"
                >
                    <div bind:this={chartElement} class="w-full h-full"></div>
                </div>

                <!-- Match history -->
                <div class="p-4 sm:p-6 space-y-px">
                    <div
                        class="font-mono text-[10px] uppercase tracking-widest text-white/20 pb-3"
                    >
                        Match History
                    </div>

                    {#each [...teamHistory].reverse() as m (m.id)}
                        {@const isTeamA = m.team_a === team.name}
                        {@const change = Math.round(
                            isTeamA ? m.gpr_change_a : m.gpr_change_b,
                        )}
                        {@const isWin = change >= 0}
                        {@const opponent = isTeamA ? m.team_b : m.team_a}
                        {@const myScore = isTeamA ? m.score_a : m.score_b}
                        {@const theirScore = isTeamA ? m.score_b : m.score_a}

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
                                <div
                                    class="flex items-center gap-3 sm:col-span-4 w-full"
                                >
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
                                            >{getSmartAbbreviation(
                                                m.tournament,
                                            )}</span
                                        >
                                        <span
                                            class="text-[9px] text-white/20 font-mono uppercase tracking-tighter"
                                            >{new Date(
                                                m.date,
                                            ).toLocaleDateString()}</span
                                        >
                                    </div>
                                </div>

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
                                        {opponent}
                                    </span>
                                    <span
                                        class="font-mono text-white/40 text-sm tabular-nums shrink-0"
                                        >{myScore}–{theirScore}</span
                                    >
                                </div>

                                <div
                                    class="hidden sm:block sm:col-span-2 text-right font-mono font-black text-sm {isWin
                                        ? 'text-[#0CD905]'
                                        : 'text-[#D90000]'}"
                                >
                                    {isWin ? "+" : ""}{change}
                                </div>
                            </div>

                            <!-- Expanded details -->
                            {#if expandedMatchId === m.id && m.details}
                                <div
                                    transition:slide
                                    class="bg-black/40 border-t border-white/5 p-4 sm:p-5 space-y-1.5"
                                >
                                    <!-- MVP -->
                                    {#if m.details.mvp}
                                        <div
                                            class="flex items-center gap-2 pb-2 mb-1 border-b border-white/5"
                                        >
                                            <span
                                                class="text-[9px] font-mono font-bold text-white/20 uppercase tracking-widest"
                                                >MVP</span
                                            >
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <div
                                                    class="w-1 h-1 rounded-full bg-amber-400"
                                                ></div>
                                                <span
                                                    class="text-xs font-bold text-amber-400 font-mono"
                                                    >{m.details.mvp}</span
                                                >
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- Maps -->
                                    {#each m.details.maps as map}
                                        {@const isMapWin =
                                            (map.winner === "1" && isTeamA) ||
                                            (map.winner === "2" && !isTeamA)}
                                        {@const myBans = isTeamA
                                            ? (map.bans?.slice(
                                                  0,
                                                  Math.ceil(
                                                      (map.bans?.length ?? 0) /
                                                          2,
                                                  ),
                                              ) ?? [])
                                            : (map.bans?.slice(
                                                  Math.ceil(
                                                      (map.bans?.length ?? 0) /
                                                          2,
                                                  ),
                                              ) ?? [])}
                                        {@const theirBans = isTeamA
                                            ? (map.bans?.slice(
                                                  Math.ceil(
                                                      (map.bans?.length ?? 0) /
                                                          2,
                                                  ),
                                              ) ?? [])
                                            : (map.bans?.slice(
                                                  0,
                                                  Math.ceil(
                                                      (map.bans?.length ?? 0) /
                                                          2,
                                                  ),
                                              ) ?? [])}

                                        <div
                                            class="flex flex-col bg-white/[0.02] border border-white/5 px-4 py-3 gap-2"
                                        >
                                            <!-- Map row -->
                                            <div
                                                class="flex items-center justify-between"
                                            >
                                                <div
                                                    class="flex items-center gap-3"
                                                >
                                                    <div
                                                        class="w-[2px] h-5 shrink-0 {isMapWin
                                                            ? 'bg-[#0CD905]'
                                                            : 'bg-[#D90000]'}"
                                                    ></div>
                                                    <div class="flex flex-col">
                                                        <span
                                                            class="text-xs font-bold font-mono text-white/80 uppercase"
                                                            >{map.name}</span
                                                        >
                                                        <span
                                                            class="text-[8px] text-white/20 font-mono uppercase tracking-widest"
                                                            >{map.mode ||
                                                                "Map"}</span
                                                        >
                                                    </div>
                                                </div>
                                                <span
                                                    class="font-mono font-bold text-sm {isMapWin
                                                        ? 'text-[#0CD905]'
                                                        : 'text-[#D90000]'}"
                                                    >{map.score}</span
                                                >
                                            </div>

                                            <!-- Bans -->
                                            {#if map.bans && map.bans.length > 0}
                                                <div
                                                    class="flex items-start gap-4 pt-2 border-t border-white/5"
                                                >
                                                    <!-- My bans -->
                                                    <div
                                                        class="flex flex-col gap-1 flex-1"
                                                    >
                                                        <span
                                                            class="text-[8px] font-mono text-white/20 uppercase tracking-widest"
                                                            >{team.name} Bans</span
                                                        >
                                                        <div
                                                            class="flex gap-1 flex-wrap"
                                                        >
                                                            {#each myBans as ban}
                                                                <div
                                                                    class="relative group"
                                                                >
                                                                    <img
                                                                        src={heroIconUrl(
                                                                            ban,
                                                                        )}
                                                                        alt={ban}
                                                                        class="w-6 h-6 rounded object-contain bg-red-500/10 border border-red-500/20 grayscale opacity-60"
                                                                    />
                                                                    <div
                                                                        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-neutral-900 border border-white/10 text-[9px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                                                    >
                                                                        {ban}
                                                                    </div>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>

                                                    <div
                                                        class="w-px bg-white/5 self-stretch"
                                                    ></div>

                                                    <!-- Their bans -->
                                                    <div
                                                        class="flex flex-col gap-1 flex-1"
                                                    >
                                                        <span
                                                            class="text-[8px] font-mono text-white/20 uppercase tracking-widest"
                                                            >{opponent} Bans</span
                                                        >
                                                        <div
                                                            class="flex gap-1 flex-wrap"
                                                        >
                                                            {#each theirBans as ban}
                                                                <div
                                                                    class="relative group"
                                                                >
                                                                    <img
                                                                        src={heroIconUrl(
                                                                            ban,
                                                                        )}
                                                                        alt={ban}
                                                                        class="w-6 h-6 rounded object-contain bg-red-500/10 border border-red-500/20 grayscale opacity-60"
                                                                    />
                                                                    <div
                                                                        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-neutral-900 border border-white/10 text-[9px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                                                    >
                                                                        {ban}
                                                                    </div>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}

                                    <!-- ── GPR BREAKDOWN PANEL ── -->
                                    {#if m.details?.debug}
                                        {@const d = m.details.debug}
                                        {@const isTeamADbg = m.team_a === team.name}
                                        {@const _change = isTeamADbg ? m.gpr_change_a : m.gpr_change_b}
                                        {@const _p1 = isTeamADbg ? d.p1_points_a : d.p1_points_b}
                                        {@const _p2 = isTeamADbg ? d.p2_perf_a : d.p2_perf_b}
                                        {@const _oppTierMe = isTeamADbg ? d.opp_tier_b : d.opp_tier_a}
                                        {@const _confMe = isTeamADbg ? d.roster_confidence_a : d.roster_confidence_b}
                                        {@const _confOpp = isTeamADbg ? d.roster_confidence_b : d.roster_confidence_a}
                                        {@const _isWin = isTeamADbg ? m.score_a > m.score_b : m.score_b > m.score_a}
                                        {@const _movLabel =
                                            d.mov_multiplier >= 1.08
                                                ? "Dominant (×1.10)"
                                                : d.mov_multiplier >= 0.95
                                                  ? "Solid (×1.00)"
                                                  : "Close (×0.90)"}
                                        {@const _tierLabel =
                                            _oppTierMe === "elite"   ? "Elite (top 5) · ×2.5"   :
                                            _oppTierMe === "strong"  ? "Strong (top 10) · ×1.8" :
                                            _oppTierMe === "solid"   ? "Solid (top 25) · ×1.2"  :
                                                                       "Weak · ×0.7"}
                                        {@const _tierColor =
                                            _oppTierMe === "elite"  ? "text-[#FF7FDE]" :
                                            _oppTierMe === "strong" ? "text-orange-400" :
                                            _oppTierMe === "solid"  ? "text-yellow-400" :
                                                                      "text-white/30"}

                                        <div class="mt-2 pt-3 border-t border-white/5 p-3 space-y-3">

                                            <!-- Section label -->
                                            <div class="flex items-center gap-2">
                                                <div class="w-1 h-1 bg-[#085FFF]"></div>
                                                <span class="text-[9px] font-mono font-bold text-white/20 uppercase tracking-widest"
                                                    >GPR impact breakdown</span>
                                            </div>

                                            <!-- ── ROW 1: three pillar cards ── -->
                                            <div class="grid grid-cols-3 gap-2">

                                                <!-- P1 · Consistency -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[8px] text-white/20 uppercase tracking-widest font-mono">P1 · Consistency</span>
                                                        <span class="text-[8px] font-mono text-white/20">40%</span>
                                                    </div>
                                                    <!-- Thin progress bar: P1 points earned this match vs a ~25pt reference -->
                                                    <div class="w-full h-[2px] bg-white/5 overflow-hidden">
                                                        <div
                                                            class="h-full transition-all {_isWin ? 'bg-[#085FFF]' : 'bg-[#D90000]'}"
                                                            style="width: {_isWin ? Math.min(100, (_p1 / 25) * 100) : Math.min(100, (Math.abs(_change) / 25) * 100)}%"
                                                        ></div>
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div class="flex justify-between gap-1">
                                                            <span class="text-[9px] text-white/25 font-mono">{_isWin ? "Points earned" : "Points lost"}</span>
                                                            <span class="text-[9px] font-mono {_isWin ? 'text-[#085FFF]' : 'text-[#D90000]'} font-bold">
                                                                {_isWin ? "+" + _p1.toFixed(1) : Math.round(_change).toString()}
                                                            </span>
                                                        </div>
                                                        <div class="flex justify-between gap-1">
                                                            <span class="text-[9px] text-white/25 font-mono">Opp. tier</span>
                                                            <span class="text-[9px] font-mono {_tierColor}">{_oppTierMe.charAt(0).toUpperCase() + _oppTierMe.slice(1)}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-1">
                                                            <span class="text-[9px] text-white/25 font-mono">Score margin</span>
                                                            <span class="text-[9px] text-white/40 font-mono">{_movLabel.split(" ")[0]}</span>
                                                        </div>
                                                        {#if d.is_regional && !d.is_major}
                                                            <div class="flex justify-between gap-1">
                                                                <span class="text-[9px] text-white/25 font-mono">Context</span>
                                                                <span class="text-[9px] text-white/30 font-mono">Regional ×0.6</span>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                </div>

                                                <!-- P2 · International -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 space-y-2 {!d.is_major ? 'opacity-35' : ''}">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[8px] text-white/20 uppercase tracking-widest font-mono">P2 · International</span>
                                                        <span class="text-[8px] font-mono text-white/20">45%</span>
                                                    </div>
                                                    {#if d.is_major}
                                                        <!-- Bar: perf is [-1, +1], map to 0–100% centred -->
                                                        <div class="w-full h-[2px] bg-white/5 overflow-hidden relative">
                                                            <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10"></div>
                                                            <div
                                                                class="h-full absolute top-0 transition-all {_p2 >= 0 ? 'bg-[#0CD905]' : 'bg-[#D90000]'}"
                                                                style="{_p2 >= 0
                                                                    ? `left: 50%; width: ${Math.min(50, _p2 * 50)}%`
                                                                    : `right: 50%; width: ${Math.min(50, Math.abs(_p2) * 50)}%`}"
                                                            ></div>
                                                        </div>
                                                        <div class="space-y-1">
                                                            <div class="flex justify-between gap-1">
                                                                <span class="text-[9px] text-white/25 font-mono">Over-expectation</span>
                                                                <span class="text-[9px] font-mono font-bold {_p2 >= 0 ? 'text-[#0CD905]' : 'text-[#D90000]'}">
                                                                    {_p2 >= 0 ? "+" : ""}{(_p2 * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div class="flex justify-between gap-1">
                                                                <span class="text-[9px] text-white/25 font-mono">Context</span>
                                                                <span class="text-[9px] text-orange-400 font-mono">Major · scored</span>
                                                            </div>
                                                            <div class="pt-1 border-t border-white/5">
                                                                <span class="text-[9px] text-white/15 font-mono leading-relaxed">
                                                                    {_p2 >= 0.3
                                                                        ? "Strong upset — large positive shift"
                                                                        : _p2 >= 0
                                                                          ? "Expected win — modest positive shift"
                                                                          : _p2 >= -0.3
                                                                            ? "Expected loss — modest negative shift"
                                                                            : "Surprise loss — large negative shift"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    {:else}
                                                        <div class="h-[2px] bg-white/5"></div>
                                                        <div class="space-y-1">
                                                            <div class="flex justify-between gap-1">
                                                                <span class="text-[9px] text-white/25 font-mono">Stage</span>
                                                                <span class="text-[9px] text-white/25 font-mono">{d.is_regional ? "Regional" : "Cross-region"}</span>
                                                            </div>
                                                            <div class="pt-1 border-t border-white/5">
                                                                <span class="text-[9px] text-white/15 font-mono leading-relaxed">
                                                                    Only Major matches affect the International pillar
                                                                </span>
                                                            </div>
                                                        </div>
                                                    {/if}
                                                </div>

                                                <!-- P3 · Momentum -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[8px] text-white/20 uppercase tracking-widest font-mono">P3 · Momentum</span>
                                                        <span class="text-[8px] font-mono text-white/20">15%</span>
                                                    </div>
                                                    <div class="w-full h-[2px] bg-white/5 overflow-hidden">
                                                        <div class="h-full {_isWin ? 'bg-[#0CD905]' : 'bg-[#D90000]'} w-full opacity-40"></div>
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div class="flex justify-between gap-1">
                                                            <span class="text-[9px] text-white/25 font-mono">Result</span>
                                                            <span class="text-[9px] font-mono font-bold {_isWin ? 'text-[#0CD905]' : 'text-[#D90000]'}">{_isWin ? "Win (+1)" : "Loss (+0)"}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-1">
                                                            <span class="text-[9px] text-white/25 font-mono">Decay window</span>
                                                            <span class="text-[9px] text-white/30 font-mono">8 weeks · ×0.75/wk</span>
                                                        </div>
                                                        <div class="pt-1 border-t border-white/5">
                                                            <span class="text-[9px] text-white/15 font-mono leading-relaxed">
                                                                This result will fade over the next 8 weeks
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- ── ROW 2: match context + roster confidence + net change ── -->
                                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">

                                                <!-- Match context -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 space-y-1">
                                                    <div class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono">Match Context</div>
                                                    <div class="flex justify-between gap-2">
                                                        <span class="text-[9px] text-white/30 font-mono">Stage</span>
                                                        <span class="text-[9px] font-mono {d.is_major ? 'text-orange-400' : 'text-white/40'}">
                                                            {d.is_major ? "Major" : d.is_regional ? "Regional" : "Cross-region"}
                                                        </span>
                                                    </div>
                                                    <div class="flex justify-between gap-2">
                                                        <span class="text-[9px] text-white/30 font-mono">Score margin</span>
                                                        <span class="text-[9px] text-white/40 font-mono">{_movLabel}</span>
                                                    </div>
                                                    <div class="flex justify-between gap-2">
                                                        <span class="text-[9px] text-white/30 font-mono">Opp. tier</span>
                                                        <span class="text-[9px] font-mono {_tierColor}">{_tierLabel}</span>
                                                    </div>
                                                </div>

                                                <!-- Roster confidence -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 space-y-1">
                                                    <div class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono">Roster Confidence</div>
                                                    <div class="flex justify-between gap-2">
                                                        <span class="text-[9px] text-white/30 font-mono truncate">{team.name}</span>
                                                        <span class="text-[9px] font-mono {_confMe < 0.75 ? 'text-yellow-400' : 'text-white/40'}">
                                                            {Math.round(_confMe * 100)}%{_confMe < 0.75 ? " · settling" : ""}
                                                        </span>
                                                    </div>
                                                    <div class="flex justify-between gap-2">
                                                        <span class="text-[9px] text-white/30 font-mono truncate">{opponent}</span>
                                                        <span class="text-[9px] font-mono {_confOpp < 0.75 ? 'text-yellow-400' : 'text-white/40'}">
                                                            {Math.round(_confOpp * 100)}%{_confOpp < 0.75 ? " · settling" : ""}
                                                        </span>
                                                    </div>
                                                    <div class="pt-1 border-t border-white/5">
                                                        <span class="text-[9px] text-white/15 font-mono leading-relaxed">
                                                            Low confidence scales down P1 points earned
                                                        </span>
                                                    </div>
                                                </div>

                                                <!-- Net GPR change -->
                                                <div class="bg-black/30 border border-white/5 p-2.5 col-span-2 sm:col-span-1">
                                                    <div class="text-[8px] text-white/20 uppercase tracking-widest mb-3 font-mono">
                                                        Net GPR · {team.name}
                                                    </div>
                                                    <div class="flex items-end justify-between">
                                                        <div>
                                                            <span class="text-[9px] text-white/20 font-mono block mb-1">Composite change</span>
                                                            <span class="text-2xl font-mono font-black tabular-nums {_isWin ? 'text-[#0CD905]' : 'text-[#D90000]'}">
                                                                {_isWin ? "+" : ""}{Math.round(_change)}
                                                            </span>
                                                        </div>
                                                        <div class="text-right space-y-0.5 pb-0.5">
                                                            <!-- Pillar weight mini-summary -->
                                                            <div class="flex items-center justify-end gap-1.5">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-[#085FFF] shrink-0"></span>
                                                                <span class="text-[8px] text-white/20 font-mono">Consistency 40%</span>
                                                            </div>
                                                            <div class="flex items-center justify-end gap-1.5">
                                                                <span class="w-1.5 h-1.5 rounded-full {d.is_major ? 'bg-orange-400' : 'bg-white/10'} shrink-0"></span>
                                                                <span class="text-[8px] {d.is_major ? 'text-orange-400/60' : 'text-white/10'} font-mono">International 45%</span>
                                                            </div>
                                                            <div class="flex items-center justify-end gap-1.5">
                                                                <span class="w-1.5 h-1.5 rounded-full {_isWin ? 'bg-[#0CD905]' : 'bg-[#D90000]'} shrink-0 opacity-50"></span>
                                                                <span class="text-[8px] text-white/20 font-mono">Momentum 15%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    {/if}
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