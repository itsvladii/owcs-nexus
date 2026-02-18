'use client';

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
    // 1. Dev Mock (Next.js uses process.env)
    if (process.env.NODE_ENV === 'development' && !match) {
       setMatch({
         tournament: "OWCS World Finals - Grand Finals",
         stream: "https://twitch.tv/ow_esports",
         teamA: { name: "Team Falcons", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2F8%2F83%2FTeam_Falcons_2022_allmode.png", score: 2 },
         teamB: { name: "Crazy Raccoon", logo: "https://wsrv.nl/?url=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2Ff%2Ffc%2FCrazy_Raccoon_2021_allmode.png", score: 1 }
       });
       return;
    }

    // 2. Real Fetch
    fetch('/api/live-now')
      .then(res => res.json())
      .then(data => { if (data) setMatch(data); })
      .catch((err) => console.error("Live match fetch failed", err));
  }, []);

  if (!match) return null;

  // Safe Score Display
  const s1 = match.teamA.score === -1 ? 0 : match.teamA.score;
  const s2 = match.teamB.score === -1 ? 0 : match.teamB.score;

  // The Content Block (Repeated for seamless loop)
  const TickerContent = () => (
    <div className="flex items-center h-full px-8 gap-8 group-hover:opacity-100 transition-opacity">
      
      {/* SEPARATOR: Angled Line */}
      <div className="h-8 w-[2px] bg-white/10 skew-x-[-20deg]"></div>

      {/* 1. TOURNAMENT TAG (Subtle) */}
      <div className="flex flex-col justify-center items-end opacity-60">
        <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase leading-none mb-1">
          Live Event
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
          {match.tournament}
        </span>
      </div>

      {/* 2. THE MATCHUP (Centerpiece) */}
      <div className="flex items-center gap-4">
         {/* Team A */}
         <div className="flex items-center gap-3">
            <span className="text-2xl font-title uppercase text-white tracking-wide">{match.teamA.name}</span>
            {match.teamA.logo && <img src={match.teamA.logo} className="h-8 w-8 object-contain" />}
         </div>

         {/* SCORE BOX (The "Pill") */}
         <div className="relative px-4 py-1 bg-white skew-x-[-10deg] border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]">
             <div className="skew-x-[10deg] flex gap-1 font-title font-black text-xl text-black leading-none">
                <span>{match.teamA.score}</span>
                <span className="text-neutral-400">-</span>
                <span>{match.teamB.score}</span>
             </div>
         </div>

         {/* Team B */}
         <div className="flex items-center gap-3">
            {match.teamB.logo && <img src={match.teamB.logo} className="h-8 w-8 object-contain" />}
            <span className="text-2xl font-title uppercase text-white tracking-wide">{match.teamB.name}</span>
         </div>
      </div>

      {/* 3. CALL TO ACTION (Pulsing) */}
      <div className="flex items-center gap-2 pl-4">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-xs font-bold text-red-400 uppercase tracking-widest group-hover:text-white transition-colors">
            Watch Stream
        </span>
      </div>

    </div>
  );

  return (
    <a 
      href={match.stream} 
      target="_blank" 
      rel="noreferrer"
      className="
        block w-full h-16 relative overflow-hidden group cursor-pointer
        bg-neutral-900/80 backdrop-blur-md border-t border-white/10
      "
    >
      {/* A. Background Texture (Scanlines) */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} 
      />

      {/* B. Edge Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent z-20 pointer-events-none"></div>

      {/* C. The Infinite Scroller */}
      <div className="flex items-center h-full animate-ticker w-max">
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
      </div>
    </a>
  );
}
