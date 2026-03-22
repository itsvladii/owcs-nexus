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

    // Dev mode — only shows on localhost
    let isDev = $state(false);
    $effect(() => {
        isDev =
            typeof window !== "undefined" &&
            window.location.hostname === "localhost";
    });

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
                                    >Rating</span
                                >
                                <span
                                    class="text-xl text-[#085FFF] font-black tabular-nums leading-tight"
                                    >{Math.round(team.rating)}</span
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
                            isTeamA ? m.elo_change_a : m.elo_change_b,
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
                                                            >{team.name} Ban Pick</span
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
                                                            >{opponent} Ban Pick</span
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

                                    <!-- ── DEV MODE DEBUG PANEL ── -->
                                    {#if isDev && m.details?.debug}
                                        {@const d = m.details.debug}
                                        {@const isTeamADbg =
                                            m.team_a === team.name}
                                        {@const _k = isTeamADbg ? d.k_a : d.k_b}
                                        {@const _exp = isTeamADbg
                                            ? d.expected_a
                                            : d.expected_b}
                                        {@const _expOpp = isTeamADbg
                                            ? d.expected_b
                                            : d.expected_a}
                                        {@const _actual = isTeamADbg
                                            ? m.elo_change_a >= 0
                                                ? 1
                                                : 0
                                            : m.elo_change_b >= 0
                                              ? 1
                                              : 0}
                                        {@const _change = isTeamADbg
                                            ? m.elo_change_a
                                            : m.elo_change_b}
                                        {@const _roster = isTeamADbg
                                            ? d.games_in_roster_a
                                            : d.games_in_roster_b}
                                        {@const _rosterOpp = isTeamADbg
                                            ? d.games_in_roster_b
                                            : d.games_in_roster_a}

                                        <div
                                            class="mt-2 pt-3 border-t border-yellow-500/20 bg-yellow-500/[0.04] p-3 space-y-3"
                                        >
                                            <!-- Dev label -->
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <div
                                                    class="w-1 h-1 rounded-full bg-yellow-400"
                                                ></div>
                                                <span
                                                    class="text-[9px] font-mono font-bold text-yellow-400/70 uppercase tracking-widest"
                                                    >ELO Debug · localhost only</span
                                                >
                                            </div>

                                            <div
                                                class="grid grid-cols-2 sm:grid-cols-3 gap-2"
                                            >
                                                <!-- Context -->
                                                <div
                                                    class="bg-black/30 border border-white/5 p-2.5"
                                                >
                                                    <div
                                                        class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono"
                                                    >
                                                        Context
                                                    </div>
                                                    <div
                                                        class="flex flex-col gap-1"
                                                    >
                                                        <span
                                                            class="text-[9px] font-mono {d.is_major
                                                                ? 'text-orange-400'
                                                                : 'text-white/40'}"
                                                            >{d.is_major
                                                                ? "⬤ Major"
                                                                : "◯ Regional Stage"}</span
                                                        >
                                                        <span
                                                            class="text-[9px] font-mono {d.is_regional
                                                                ? 'text-[#085FFF]'
                                                                : 'text-purple-400'}"
                                                            >{d.is_regional
                                                                ? "⬤ Regional"
                                                                : "⬤ International"}</span
                                                        >
                                                        <span
                                                            class="text-[9px] font-mono {d.bully_penalty
                                                                ? 'text-red-400'
                                                                : 'text-white/20'}"
                                                            >{d.bully_penalty
                                                                ? "⬤ Bully Penalty ×0.5"
                                                                : "◯ No Bully Penalty"}</span
                                                        >
                                                    </div>
                                                </div>

                                                <!-- K Factor -->
                                                <div
                                                    class="bg-black/30 border border-white/5 p-2.5"
                                                >
                                                    <div
                                                        class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono"
                                                    >
                                                        K Factor
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono"
                                                                >Base</span
                                                            >
                                                            <span
                                                                class="text-[9px] text-white/60 font-mono"
                                                                >{d.base_k}</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono"
                                                                >MoV ×</span
                                                            >
                                                            <span
                                                                class="text-[9px] text-white/60 font-mono"
                                                                >{d.mov_multiplier}</span
                                                            >
                                                        </div>
                                                        {#if d.bully_penalty}
                                                            <div
                                                                class="flex justify-between"
                                                            >
                                                                <span
                                                                    class="text-[9px] text-white/30 font-mono"
                                                                    >Bully ×</span
                                                                >
                                                                <span
                                                                    class="text-[9px] text-red-400 font-mono"
                                                                    >0.5</span
                                                                >
                                                            </div>
                                                        {/if}
                                                        <div
                                                            class="flex justify-between border-t border-white/5 pt-1 mt-1"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/40 font-mono"
                                                                >Final K</span
                                                            >
                                                            <span
                                                                class="text-[9px] text-yellow-400 font-mono font-bold"
                                                                >{_k.toFixed(
                                                                    2,
                                                                )}</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Win probability -->
                                                <div
                                                    class="bg-black/30 border border-white/5 p-2.5"
                                                >
                                                    <div
                                                        class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono"
                                                    >
                                                        Win Probability
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono truncate mr-2"
                                                                >{team.name}</span
                                                            >
                                                            <span
                                                                class="text-[9px] text-[#085FFF] font-mono font-bold"
                                                                >{(
                                                                    _exp * 100
                                                                ).toFixed(
                                                                    1,
                                                                )}%</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono truncate mr-2"
                                                                >{opponent}</span
                                                            >
                                                            <span
                                                                class="text-[9px] text-white/40 font-mono"
                                                                >{(
                                                                    _expOpp *
                                                                    100
                                                                ).toFixed(
                                                                    1,
                                                                )}%</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Calibration -->
                                                <div
                                                    class="bg-black/30 border border-white/5 p-2.5"
                                                >
                                                    <div
                                                        class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono"
                                                    >
                                                        Calibration
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono truncate mr-2"
                                                                >{team.name}</span
                                                            >
                                                            <span
                                                                class="text-[9px] font-mono {_roster <
                                                                6
                                                                    ? 'text-yellow-400'
                                                                    : 'text-white/40'}"
                                                                >{_roster} games{_roster <
                                                                6
                                                                    ? " ⚡"
                                                                    : ""}</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="flex justify-between"
                                                        >
                                                            <span
                                                                class="text-[9px] text-white/30 font-mono truncate mr-2"
                                                                >{opponent}</span
                                                            >
                                                            <span
                                                                class="text-[9px] font-mono {_rosterOpp <
                                                                6
                                                                    ? 'text-yellow-400'
                                                                    : 'text-white/40'}"
                                                                >{_rosterOpp} games{_rosterOpp <
                                                                6
                                                                    ? " ⚡"
                                                                    : ""}</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Formula -->
                                                <div
                                                    class="bg-black/30 border border-white/5 p-2.5 sm:col-span-2"
                                                >
                                                    <div
                                                        class="text-[8px] text-white/20 uppercase tracking-widest mb-2 font-mono"
                                                    >
                                                        Formula · {team.name}
                                                    </div>
                                                    <div
                                                        class="font-mono text-[10px] text-white/50"
                                                    >
                                                        <span
                                                            class="text-yellow-400"
                                                            >{_k.toFixed(
                                                                2,
                                                            )}</span
                                                        >
                                                        <span
                                                            class="text-white/20"
                                                        >
                                                            × (</span
                                                        >
                                                        <span
                                                            class="text-[#085FFF]"
                                                            >{_actual}</span
                                                        >
                                                        <span
                                                            class="text-white/20"
                                                        >
                                                            −
                                                        </span>
                                                        <span
                                                            class="text-purple-400"
                                                            >{_exp.toFixed(
                                                                3,
                                                            )}</span
                                                        >
                                                        <span
                                                            class="text-white/20"
                                                            >) =
                                                        </span>
                                                        <span
                                                            class="font-black {_change >=
                                                            0
                                                                ? 'text-[#0CD905]'
                                                                : 'text-[#D90000]'}"
                                                            >{_change >= 0
                                                                ? "+"
                                                                : ""}{Math.round(
                                                                _change,
                                                            )}</span
                                                        >
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
