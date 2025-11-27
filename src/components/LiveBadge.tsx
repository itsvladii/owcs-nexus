import React, { useState, useEffect } from 'react';

export default function LiveBadge({ teamName }: { teamName: string }) {
  const [status, setStatus] = useState<{ isLive: boolean; opponent?: string } | null>(null);

  useEffect(() => {
    // --- DEV TEST MODE ---
    // If on localhost, force the badge to show so you can see it.
    if (import.meta.env.DEV) {
       // You can make it random or fixed.
       // Here we set it to always be LIVE against a "Test Team"
       setStatus({ isLive: true, opponent: "Test Opponent" });
       return; 
    }
    // ---------------------

    // Real Production Fetch
    fetch(`/api/check-live?team=${encodeURIComponent(teamName)}`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus(null));
  }, [teamName]);

  if (!status || !status.isLive) return null;

  return (
    <a 
      href="https://twitch.tv/ow_esports" 
      target="_blank"
      rel="noreferrer"
      className="
        inline-flex items-center gap-2 
        bg-red-600/10 border border-red-500/50 
        px-3 py-1 rounded-full 
        animate-in fade-in duration-500 cursor-pointer 
        hover:bg-red-600/20 transition-colors group
        ml-3 /* Added margin-left to separate it from other badges */
      "
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      
      <span className="text-red-400 font-bold text-[10px] uppercase tracking-widest group-hover:text-red-300">
        Live vs {status.opponent || "Opponent"}
      </span>
    </a>
  );
}