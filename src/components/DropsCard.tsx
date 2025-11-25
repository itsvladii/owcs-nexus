import React, { useState, useEffect } from 'react';
import dropsData from '../data/drops.json';

const BANNER_URL = "/drops-banner.png"; 

export default function DropsCard() {
  // 1. STATE: Track the current active/upcoming session
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [statusLabel, setStatusLabel] = useState("Upcoming");

  useEffect(() => {
    if (!dropsData.isActive) return;

    const now = new Date();

    // LOGIC: Find the most relevant session
    // 1. Is there a session happening RIGHT NOW?
    let target = dropsData.schedule.find(day => {
       const start = new Date(day.startTimestamp);
       const end = new Date(day.endTimestamp);
       return now >= start && now <= end;
    });

    if (target) {
      setCurrentSession(target);
      setStatusLabel("Live Now");
      return;
    }

    // 2. If not, find the NEXT upcoming session
    target = dropsData.schedule.find(day => {
       const start = new Date(day.startTimestamp);
       return now < start;
    });

    if (target) {
      setCurrentSession(target);
      setStatusLabel("Coming Soon");
    } else {
      // 3. If no upcoming sessions, maybe show the last one or nothing
      // (Optional: Set to null to hide card)
      setCurrentSession(null); 
    }

  }, []);

  // If master switch is off OR no relevant session found (event over), hide.
  if (!dropsData.isActive || !currentSession) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl group mb-12 border border-orange-500/30">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-950/95 via-orange-900/80 to-orange-900/40"></div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* TEXT */}
        <div className="text-center lg:text-left lg:max-w-xs shrink-0">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
            
            {/* Status Indicator */}
            <div className={`relative flex h-3 w-3 ${statusLabel === "Live Now" ? "" : "hidden"}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </div>
            
            <span className={`font-bold text-xs uppercase tracking-widest px-2 py-1 rounded backdrop-blur-sm border ${
                statusLabel === "Live Now" 
                ? "text-red-400 bg-black/40 border-red-500/30" 
                : "text-amber-200 bg-amber-900/40 border-amber-500/30"
            }`}>
                {statusLabel}
            </span>
            
            {/* Day Label */}
            <span className="text-orange-200/60 text-xs font-mono font-bold border-l border-orange-500/30 pl-3">
                {currentSession.displayDate}
            </span>
          </div>

          <h3 className="text-3xl md:text-4xl font-title text-white mb-2 drop-shadow-md leading-none">
             {dropsData.title}
          </h3>
          <p className="text-orange-100/80 font-medium text-sm leading-snug drop-shadow-sm">
             {currentSession.name}
          </p>
        </div>

        {/* REWARDS (Dynamic based on Day) */}
        <div className="flex-1 flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {currentSession.rewards.map((reward: any, index: number) => (
                <div key={index} className="flex flex-col items-center relative group/reward">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-neutral-900/60 backdrop-blur-md rounded-xl border border-orange-500/30 flex items-center justify-center shadow-lg transition-all group-hover/reward:border-orange-400 group-hover/reward:scale-110 group-hover/reward:bg-orange-900/40">
                        <img src={reward.image} alt={reward.name} className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-xl" />
                    </div>
                    <span className="absolute -bottom-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-orange-400">
                        {reward.hours}h
                    </span>
                </div>
            ))}
        </div>

        {/* BUTTON */}
        <div className="lg:w-auto shrink-0">
            <a 
            href={dropsData.streamLink} 
            target="_blank" 
            rel="noreferrer"
            className={`inline-block px-8 py-4 font-black font-title text-xl uppercase tracking-wide rounded-lg shadow-lg transition-all hover:scale-105 whitespace-nowrap ${
                statusLabel === "Live Now"
                ? "bg-white text-orange-900 hover:bg-orange-50 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                : "bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-80"
            }`}
            >
            {statusLabel === "Live Now" ? "Watch Now" : "Starts Soon"}
            </a>
        </div>

      </div>
    </div>
  );
}