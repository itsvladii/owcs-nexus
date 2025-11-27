import React, { useState, useEffect } from 'react';

interface LiveData {
  tournament: string;
  stream: string;
  teamA: { name: string; logo: string; score: number };
  teamB: { name: string; logo: string; score: number };
}

export default function LiveMatchCard() {
  const [match, setMatch] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for dev (remove or comment out for prod)
    if (import.meta.env.DEV && !match) {
       setMatch({
         tournament: "OWCS World Finals",
         stream: "https://twitch.tv/ow_esports",
         teamA: { name: "Team Falcons", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2F8%2F83%2FTeam_Falcons_2022_allmode.png", score: 2 },
         teamB: { name: "Crazy Raccoon", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2Ff%2Ffc%2FCrazy_Raccoon_2021_allmode.png", score: 1 }
       });
       setLoading(false);
       return;
    }

    fetch('/api/live-now')
      .then(res => res.json())
      .then(data => {
        if (data) setMatch(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!match) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-[0_0_25px_-5px_rgba(220,38,38,0.4)] group mb-12 border border-red-500/30 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* SLIM BACKGROUND */}
      <div className="absolute inset-0 bg-neutral-900">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/80 via-neutral-900 to-red-950/80"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5"></div> {/* Optional Texture */}
      </div>

      <div className="relative z-10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
        
        {/* LEFT: BADGE & TOURNEY (Compact) */}
        <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.2)]">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               <span className="text-red-400 font-bold text-[10px] uppercase tracking-widest">Live</span>
            </div>
            <span className="text-neutral-400 font-bold uppercase tracking-wider text-xs hidden sm:block truncate max-w-[150px]">
                {match.tournament}
            </span>
        </div>

        {/* CENTER: THE MATCHUP (Horizontal & Tight) */}
        <div className="flex items-center justify-center gap-4 md:gap-8 flex-1">
            <div className="flex items-center gap-3">
                <span className="text-white font-title text-xl hidden md:block text-right w-32 truncate">{match.teamA.name}</span>
                <img src={match.teamA.logo} className="w-10 h-10 object-contain drop-shadow-md" />
            </div>

            <div className="text-2xl font-mono font-bold text-white bg-neutral-950/60 px-3 py-1 rounded border border-white/5 shadow-inner">
                <span className="text-red-500">{match.teamA.score}</span>
                <span className="text-neutral-600 mx-1">:</span>
                <span className="text-blue-500">{match.teamB.score}</span>
            </div>

            <div className="flex items-center gap-3">
                <img src={match.teamB.logo} className="w-10 h-10 object-contain drop-shadow-md" />
                <span className="text-white font-title text-xl hidden md:block text-left w-32 truncate">{match.teamB.name}</span>
            </div>
        </div>

        {/* RIGHT: BUTTON (Small) */}
        <a 
          href={match.stream} 
          target="_blank" 
          rel="noreferrer"
          className="shrink-0 px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold font-title text-sm uppercase tracking-wide rounded transition-all hover:scale-105 shadow-lg"
        >
          Watch
        </a>

      </div>
    </div>
  );
}