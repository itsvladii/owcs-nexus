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

    // Shorten team names for tight mobile displays
    function shortenTeam(name: string): string {
        if (!name) return "";
        // If name is long, try to use acronym or first word
        if (name.length <= 10) return name;
        const words = name.split(" ");
        if (words.length >= 2) {
            // "Anyone's Legend" → "AL", "Lunex Gaming" → "Lunex"
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
        class="w-full border-t border-b border-neutral-800 bg-neutral-950/60 backdrop-blur-sm mb-12"
        style="height:56px; overflow:hidden;"
    >
        <div class="flex items-stretch h-full">
            <!-- Left label -->
            <div
                class="flex items-center gap-2 px-3 border-r border-neutral-800 shrink-0"
            >
                <span
                    class="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"
                ></span>
                <span
                    class="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.3em] whitespace-nowrap hidden sm:inline"
                    >Recent Results</span
                >
                <span
                    class="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.2em] whitespace-nowrap sm:hidden"
                    >Results</span
                >
            </div>

            <!-- Sliding window -->
            <div class="flex-1 relative overflow-hidden min-w-0">
                <div
                    class="flex flex-col transition-transform"
                    style="
          height: 112px;
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

                        <div
                            class="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 shrink-0 min-w-0"
                            style="height:56px;"
                        >
                            <!-- Tournament — desktop only -->
                            <span
                                class="text-[10px] font-mono text-neutral-500 uppercase tracking-wider whitespace-nowrap hidden md:inline shrink-0"
                            >
                                {shortenTournament(match?.tournament ?? "")}
                            </span>
                            <div
                                class="w-px h-3 bg-neutral-800 hidden md:inline-block shrink-0"
                            ></div>

                            <!-- Team A -->
                            <div
                                class="flex items-center gap-1.5 min-w-0 shrink-0"
                            >
                                {#if teamA.logo}
                                    <img
                                        src={teamA.logo}
                                        alt={match?.team_a}
                                        class="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0 {aWon
                                            ? ''
                                            : 'opacity-25 grayscale'}"
                                    />
                                {/if}
                                <!-- Full name on sm+, short on mobile -->
                                <span
                                    class="font-title text-sm uppercase tracking-wide whitespace-nowrap {aWon
                                        ? 'text-white'
                                        : 'text-neutral-600'} hidden sm:inline"
                                >
                                    {match?.team_a}
                                </span>
                                <span
                                    class="font-title text-xs uppercase tracking-wide whitespace-nowrap {aWon
                                        ? 'text-white'
                                        : 'text-neutral-600'} sm:hidden"
                                >
                                    {shortenTeam(match?.team_a ?? "")}
                                </span>
                            </div>

                            <!-- Score -->
                            <div
                                class="flex items-center gap-1.5 font-mono font-black text-sm sm:text-base tabular-nums shrink-0 px-2.5 sm:px-3 py-1 bg-neutral-900 border border-neutral-800 rounded"
                            >
                                <span
                                    class={aWon
                                        ? "text-white"
                                        : "text-neutral-500"}
                                    >{match?.score_a}</span
                                >
                                <span class="text-neutral-700">–</span>
                                <span
                                    class={!aWon
                                        ? "text-white"
                                        : "text-neutral-500"}
                                    >{match?.score_b}</span
                                >
                            </div>

                            <!-- Team B -->
                            <div
                                class="flex items-center gap-1.5 min-w-0 shrink-0"
                            >
                                {#if teamB.logo}
                                    <img
                                        src={teamB.logo}
                                        alt={match?.team_b}
                                        class="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0 {!aWon
                                            ? ''
                                            : 'opacity-25 grayscale'}"
                                    />
                                {/if}
                                <span
                                    class="font-title text-sm uppercase tracking-wide whitespace-nowrap {!aWon
                                        ? 'text-white'
                                        : 'text-neutral-600'} hidden sm:inline"
                                >
                                    {match?.team_b}
                                </span>
                                <span
                                    class="font-title text-xs uppercase tracking-wide whitespace-nowrap {!aWon
                                        ? 'text-white'
                                        : 'text-neutral-600'} sm:hidden"
                                >
                                    {shortenTeam(match?.team_b ?? "")}
                                </span>
                            </div>

                            <!-- ELO change -->
                            <span
                                class="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 whitespace-nowrap ml-auto shrink-0"
                            >
                                {eloLabel(
                                    aWon
                                        ? (match?.elo_change_a ?? 0)
                                        : (match?.elo_change_b ?? 0),
                                )} pts
                            </span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Progress dots — desktop only -->
            <div
                class="hidden sm:flex items-center gap-1 px-3 border-l border-neutral-800 shrink-0"
            >
                {#each recent as _, i}
                    <span
                        class="rounded-full transition-all duration-300
          {i === currentIndex
                            ? 'w-3 h-1.5 bg-neutral-400'
                            : 'w-1.5 h-1.5 bg-neutral-700'}"
                    >
                    </span>
                {/each}
            </div>
        </div>
    </div>
{/if}
