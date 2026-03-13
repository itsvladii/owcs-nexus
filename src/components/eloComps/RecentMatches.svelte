<script lang="ts">
    import { onMount, onDestroy } from "svelte";

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

    interface TeamInfo {
        logo?: string;
    }

    export let matches: Match[] = [];
    export let teamInfo: Record<string, TeamInfo> = {};

    $: recent = [...matches]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 12);

    let currentIndex = 0;
    let animating = false;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        if (recent.length <= 1) return;
        interval = setInterval(() => {
            animating = true;
            setTimeout(() => {
                currentIndex = (currentIndex + 1) % recent.length;
                animating = false;
            }, 400);
        }, 3000);
    });

    onDestroy(() => clearInterval(interval));

    function shortenTournament(name: string): string {
        return name
            .replace(/Overwatch Champions Series/g, "OWCS")
            .replace(/ 20(\d\d)/g, " '$1")
            .replace(/Stage (\d)/g, "S$1")
            .replace(/Season (\d)/g, "S$1")
            .replace(/North America/g, "NA")
            .replace(/South Korea/g, "Korea")
            .trim();
    }

    function shortenTeam(name: string): string {
        if (!name) return "";
        if (name.length <= 10) return name;
        const words = name.split(" ");
        if (words.length >= 2) {
            return words.length >= 3
                ? words
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                : words[0];
        }
        return name.substring(0, 8) + "…";
    }

    function getTeam(name: string): TeamInfo {
        return teamInfo[name?.toLowerCase()] ?? {};
    }

    function eloLabel(change: number): string {
        const r = Math.round(change);
        return r > 0 ? `+${r}` : `${r}`;
    }

    $: current = recent[currentIndex];
    $: next = recent[(currentIndex + 1) % recent.length];
</script>

{#if recent.length > 0}
    <div
        class="w-full bg-[#0d0d0d] border-b border-white/5"
        style="height:64px; overflow:hidden;"
    >
        <!-- Max-width wrapper — tighter padding on mobile -->
        <div class="max-w-[1600px] mx-auto px-2 sm:px-6 h-full">
            <div class="flex items-stretch h-full">
                <!-- Left label — dot always visible, text hidden on xs -->
                <div
                    class="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-4 border-r border-white/5 shrink-0"
                >
                    <span
                        class="w-1.5 h-1.5 rounded-full bg-[#085FFF] animate-pulse shadow-[0_0_6px_#085FFF] shrink-0"
                    ></span>
                    <span
                        class="text-[10px] font-mono text-white/30 uppercase tracking-[0.35em] whitespace-nowrap hidden sm:inline"
                    >
                        Recent Results
                    </span>
                </div>

                <!-- Sliding window -->
                <div class="flex-1 relative overflow-hidden min-w-0">
                    <div
                        class="flex flex-col transition-transform"
                        style="
                        height: 128px;
                        transform: translateY({animating ? '-50%' : '0%'});
                        transition-duration: {animating ? '400ms' : '0ms'};
                        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    "
                    >
                        {#each [current, next] as match}
                            {@const teamA = getTeam(match?.team_a ?? "")}
                            {@const teamB = getTeam(match?.team_b ?? "")}
                            {@const aWon =
                                (match?.score_a ?? 0) > (match?.score_b ?? 0)}
                            {@const winner_elo = aWon
                                ? (match?.elo_change_a ?? 0)
                                : (match?.elo_change_b ?? 0)}

                            <div
                                class="flex items-center justify-center gap-2 sm:gap-5 md:gap-6 shrink-0 min-w-0 px-1"
                                style="height:64px;"
                            >
                                <!-- Tournament label — md+ only -->
                                <span
                                    class="text-[10px] font-mono text-white/20 uppercase tracking-wider whitespace-nowrap hidden md:inline shrink-0"
                                >
                                    {shortenTournament(match?.tournament ?? "")}
                                </span>
                                <div
                                    class="w-px h-3 bg-white/5 hidden md:block shrink-0"
                                ></div>

                                <!-- Team A -->
                                <div
                                    class="flex items-center gap-1.5 sm:gap-2 shrink-0"
                                >
                                    {#if teamA.logo}
                                        <img
                                            src={teamA.logo}
                                            alt={match?.team_a}
                                            class="h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0 transition-opacity {aWon
                                                ? 'opacity-100'
                                                : 'opacity-20 grayscale'}"
                                        />
                                    {/if}
                                    <!-- Full name: sm+ | Abbreviated: xs only -->
                                    <span
                                        class="font-title text-[13px] sm:text-base uppercase tracking-wide whitespace-nowrap {aWon
                                            ? 'text-white'
                                            : 'text-white/25'} hidden sm:inline"
                                    >
                                        {match?.team_a}
                                    </span>
                                    <span
                                        class="font-title text-[11px] uppercase tracking-wide whitespace-nowrap {aWon
                                            ? 'text-white'
                                            : 'text-white/25'} sm:hidden"
                                    >
                                        {shortenTeam(match?.team_a ?? "")}
                                    </span>
                                </div>

                                <!-- Score — compact on mobile -->
                                <div
                                    class="flex items-center gap-1.5 sm:gap-2 font-mono font-black tabular-nums shrink-0
                                        text-sm sm:text-base
                                        px-2.5 sm:px-4 py-1
                                        bg-white/[0.04] border border-white/[0.06]"
                                >
                                    <span
                                        class={aWon
                                            ? "text-white"
                                            : "text-white/25"}
                                        >{match?.score_a}</span
                                    >
                                    <span class="text-white/15">–</span>
                                    <span
                                        class={!aWon
                                            ? "text-white"
                                            : "text-white/25"}
                                        >{match?.score_b}</span
                                    >
                                </div>

                                <!-- Team B -->
                                <div
                                    class="flex items-center gap-1.5 sm:gap-2 shrink-0"
                                >
                                    {#if teamB.logo}
                                        <img
                                            src={teamB.logo}
                                            alt={match?.team_b}
                                            class="h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0 transition-opacity {!aWon
                                                ? 'opacity-100'
                                                : 'opacity-20 grayscale'}"
                                        />
                                    {/if}
                                    <span
                                        class="font-title text-[13px] sm:text-base uppercase tracking-wide whitespace-nowrap {!aWon
                                            ? 'text-white'
                                            : 'text-white/25'} hidden sm:inline"
                                    >
                                        {match?.team_b}
                                    </span>
                                    <span
                                        class="font-title text-[11px] uppercase tracking-wide whitespace-nowrap {!aWon
                                            ? 'text-white'
                                            : 'text-white/25'} sm:hidden"
                                    >
                                        {shortenTeam(match?.team_b ?? "")}
                                    </span>
                                </div>

                                <!-- ELO change — shorter label on mobile -->
                                <span
                                    class="font-mono font-bold text-[#085FFF] whitespace-nowrap shrink-0 text-[11px] sm:text-xs"
                                >
                                    <span class="hidden sm:inline"
                                        >{eloLabel(winner_elo)} pts</span
                                    >
                                    <span class="sm:hidden"
                                        >{eloLabel(winner_elo)}</span
                                    >
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Progress dots — hidden on mobile, shown sm+ -->
                <div
                    class="hidden sm:flex items-center gap-1 px-4 border-l border-white/5 shrink-0"
                >
                    {#each recent as _, i}
                        <span
                            class="transition-all duration-300 {i ===
                            currentIndex
                                ? 'w-3 h-[3px] bg-[#085FFF] shadow-[0_0_4px_#085FFF]'
                                : 'w-[5px] h-[3px] bg-white/10'}"
                        ></span>
                    {/each}
                </div>
            </div>
        </div>
        <!-- end max-width wrapper -->
    </div>
{/if}
