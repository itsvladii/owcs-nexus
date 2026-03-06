<script lang="ts">
    import { onMount } from "svelte";

    interface LiveData {
        tournament: string;
        stream: string;
        teamA: { name: string; logo: string; score: number };
        teamB: { name: string; logo: string; score: number };
    }

    let match: LiveData | null = null;

    onMount(async () => {
        const isDev = import.meta.env.DEV;
        if (isDev && !match) {
            match = {
                tournament: "OWCS World Finals - Grand Finals",
                stream: "https://twitch.tv/ow_esports",
                teamA: {
                    name: "Team Falcons",
                    logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2F8%2F83%2FTeam_Falcons_2022_allmode.png",
                    score: 2,
                },
                teamB: {
                    name: "Crazy Raccoon",
                    logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2Ff%2Ffc%2FCrazy_Raccoon_2021_allmode.png",
                    score: 1,
                },
            };
            return;
        }

        // 2. Real Fetch Logic
        try {
            const res = await fetch("/api/live-now");
            const data = await res.json();
            if (data) match = data;
        } catch (err) {
            console.error("Live match fetch failed", err);
        }
    });
</script>

{#if match}
    <a
        href={match.stream}
        target="_blank"
        rel="noreferrer"
        class="block w-full h-16 relative overflow-hidden group cursor-pointer bg-neutral-900/80 backdrop-blur-md border-t border-white/10"
    >
        <div
            class="absolute inset-0 pointer-events-none opacity-20"
            style="background-image: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 2px, 3px 100%;"
        />

        <div
            class="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent z-20 pointer-events-none"
        ></div>
        <div
            class="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent z-20 pointer-events-none"
        ></div>

        <div class="flex items-center h-full animate-ticker w-max">
            {#each Array(5) as _}
                <div
                    class="flex items-center h-full px-8 gap-8 group-hover:opacity-100 transition-opacity"
                >
                    <div class="h-8 w-[2px] bg-white/10 skew-x-[-20deg]"></div>

                    <div
                        class="flex flex-col justify-center items-end opacity-60"
                    >
                        <span
                            class="text-[10px] font-bold tracking-widest text-emerald-400 uppercase leading-none mb-1"
                        >
                            Live Event
                        </span>
                        <span
                            class="text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap"
                        >
                            {match.tournament}
                        </span>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-3">
                            <span
                                class="text-2xl font-title uppercase text-white tracking-wide"
                                >{match.teamA.name}</span
                            >
                            {#if match.teamA.logo}
                                <img
                                    src={match.teamA.logo}
                                    alt={match.teamA.name}
                                    class="h-8 w-8 object-contain"
                                />
                            {/if}
                        </div>

                        <div
                            class="relative px-4 py-1 bg-white skew-x-[-10deg] border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        >
                            <div
                                class="skew-x-[10deg] flex gap-1 font-title font-black text-xl text-black leading-none"
                            >
                                <span
                                    >{match.teamA.score === -1
                                        ? 0
                                        : match.teamA.score}</span
                                >
                                <span class="text-neutral-400">-</span>
                                <span
                                    >{match.teamB.score === -1
                                        ? 0
                                        : match.teamB.score}</span
                                >
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            {#if match.teamB.logo}
                                <img
                                    src={match.teamB.logo}
                                    alt={match.teamB.name}
                                    class="h-8 w-8 object-contain"
                                />
                            {/if}
                            <span
                                class="text-2xl font-title uppercase text-white tracking-wide"
                                >{match.teamB.name}</span
                            >
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pl-4">
                        <span class="relative flex h-2 w-2">
                            <span
                                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
                            ></span>
                            <span
                                class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                            ></span>
                        </span>
                        <span
                            class="text-xs font-bold text-red-400 uppercase tracking-widest group-hover:text-white transition-colors"
                        >
                            Watch Stream
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    </a>
{/if}

<style>
    /* Ensure the ticker animation is defined in your global CSS or here */
    :global(.animate-ticker) {
        animation: ticker 30s linear infinite;
    }

    @keyframes ticker {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-20%);
        } /* Adjust based on content width */
    }
</style>
