import React, { useState, useEffect } from 'react';

interface LiveData {
  tournament: string;
  stream: string;
  teamA: { name: string; logo: string; score: number };
  teamB: { name: string; logo: string; score: number };
}

export default function LiveMatchCard() {
  const [match, setMatch] = useState<LiveData | null>(null);

  useEffect(() => {
    // Dev Mock
    /*if (import.meta.env.DEV && !match) {
       setMatch({
         tournament: "OWCS World Finals - Grand Finals",
         stream: "https://twitch.tv/overwatch_esports",
         teamA: { name: "Team Falcons", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2F8%2F83%2FTeam_Falcons_2022_allmode.png", score: 2 },
         teamB: { name: "Crazy Raccoon", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2Ff%2Ffc%2FCrazy_Raccoon_2021_allmode.png", score: 1 }
       });
       return;
    }*/

    fetch('/api/live-now')
      .then(res => res.json())
      .then(data => { if (data) setMatch(data); })
      .catch(() => {});
  }, []);

  if (!match) return null;

  const s1 = match.teamA.score === -1 ? 0 : match.teamA.score;
  const s2 = match.teamB.score === -1 ? 0 : match.teamB.score;

  // The Scrolling Content Block
  const TickerContent = () => (
    <div className="flex items-center gap-12 px-12 border-r border-white/10 h-full min-w-max">
      
      {/* LIVE BADGE */}
      <div className="flex items-center gap-3 bg-red-600 px-4 py-1.5 rounded-full shadow-lg shadow-red-900/50 shrink-0">
         <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
         </span>
         <span className="text-white font-black text-xs uppercase tracking-[0.2em]">LIVE NOW</span>
      </div>

      {/* MATCHUP (Bigger Text) */}
      <div className="flex items-center gap-6 shrink-0">
         <div className="flex items-center gap-4">
            {match.teamA.logo && <img src={match.teamA.logo} className="h-10 w-10 object-contain drop-shadow-md" />}
            <span className="text-white font-title text-3xl tracking-wide">{match.teamA.name}</span>
         </div>
         
         <div className="bg-neutral-900 px-4 py-1 rounded border border-neutral-800">
             <span className="text-red-500 font-mono font-bold text-3xl">
                {s1} - {s2}
             </span>
         </div>

         <div className="flex items-center gap-4">
            <span className="text-white font-title text-3xl tracking-wide">{match.teamB.name}</span>
            {match.teamB.logo && <img src={match.teamB.logo} className="h-10 w-10 object-contain drop-shadow-md" />}
         </div>
      </div>

      {/* TOURNAMENT INFO */}
      <span className="text-neutral-400 font-bold uppercase tracking-widest text-sm shrink-0 border-l border-white/10 pl-8">
        {match.tournament}
      </span>

      {/* CTA */}
      <span className="text-amber-500 text-xs font-bold uppercase tracking-[0.2em] group-hover:text-white transition-colors shrink-0 flex items-center gap-2">
        CLICK TO WATCH <span className="text-lg">→</span>
      </span>
      
    </div>
  );

  return (
    <a 
      href={match.stream} 
      target="_blank" 
      rel="noreferrer"
      className="
        block w-full bg-neutral-950 border-y border-red-900/30 overflow-hidden relative group 
        h-20 /* Increased Height so it's not cramped */
        flex items-center hover:bg-neutral-900 transition-colors cursor-pointer
      "
    >
      {/* Red Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-transparent to-red-900/20 pointer-events-none"></div>
      
      {/* Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent z-20 pointer-events-none"></div>

      {/* THE SCROLLER */}
      {/* Duplicate content enough times to fill wide screens */}
      <div className="animate-ticker flex items-center h-full">
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
      </div>
    </a>
  );
}