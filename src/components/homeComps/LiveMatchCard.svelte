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
        class="block w-full h-14 md:h-16 bg-[#080808] border-y border-white/10 relative group overflow-hidden"
    >
        <div class="flex items-center h-full animate-ticker w-max">
            {#each Array(10) as _}
                <div
                    class="flex items-center h-full px-6 md:px-12 gap-6 md:gap-10 border-r border-white/5"
                >
                    <div class="flex items-center gap-2">
                        <span
                            class="w-1.5 h-1.5 rounded-full bg-[#085FFF] animate-pulse shadow-[0_0_8px_#085FFF]"
                        ></span>
                        <span
                            class="text-[9px] font-black uppercase tracking-[0.2em] text-[#085FFF]"
                            >Live Now</span
                        >
                    </div>

                    <span
                        class="hidden sm:block text-[10px] font-bold uppercase tracking-tight text-white/30 italic whitespace-nowrap"
                    >
                        {match.tournament}
                    </span>

                    <div class="flex items-center gap-4 md:gap-8">
                        <div class="flex items-center gap-3">
                            <span
                                class="font-title text-sm md:text-lg uppercase italic text-white tracking-tighter whitespace-nowrap"
                            >
                                {match.teamA.name}
                            </span>
                            <img
                                src={match.teamA.logo}
                                alt=""
                                class="h-6 w-6 md:h-8 md:w-8 object-contain"
                            />
                        </div>

                        <div
                            class="bg-white px-3 md:px-6 py-0.5 md:py-1 skew-x-[-15deg] shadow-[0_0_15px_rgba(8,95,255,0.2)]"
                        >
                            <div
                                class="skew-x-[15deg] flex items-center gap-2 md:gap-3 font-title text-sm md:text-xl font-black text-black"
                            >
                                <span
                                    >{match.teamA.score < 0
                                        ? 0
                                        : match.teamA.score}</span
                                >
                                <span class="opacity-20">-</span>
                                <span
                                    >{match.teamB.score < 0
                                        ? 0
                                        : match.teamB.score}</span
                                >
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <img
                                src={match.teamB.logo}
                                alt=""
                                class="h-6 w-6 md:h-8 md:w-8 object-contain"
                            />
                            <span
                                class="font-title text-sm md:text-lg uppercase italic text-white tracking-tighter whitespace-nowrap"
                            >
                                {match.teamB.name}
                            </span>
                        </div>
                    </div>

                    <div
                        class="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                        <span
                            class="text-[10px] font-black text-white uppercase tracking-widest italic"
                            >See The Match</span
                        >
                        <svg class="w-2 h-2 fill-[#085FFF]" viewBox="0 0 24 24"
                            ><path d="M21 12l-18 12v-24z" /></svg
                        >
                    </div>
                </div>
            {/each}
        </div>
    </a>
{/if}

<style>
    :global(.animate-ticker) {
        /* Faster speed for a more energetic sports feel */
        animation: ticker 40s linear infinite;
    }

    @keyframes ticker {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }
</style>
