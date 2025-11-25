import React from 'react';
import dropsData from '../data/drops.json';

const BANNER_URL = "/drops-banner.png"; 

export default function DropsCard() {
  if (!dropsData.isActive) return null;

  return (
    // CHANGED: Border color to Orange
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl group mb-12 border border-orange-500/30">
      
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0">
        
        {/* CHANGED: Gradient to Warm Orange/Red */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-950/95 via-orange-900/80 to-orange-900/40"></div>
      </div>

      {/* CONTENT CONTAINER */}
      <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* 1. TEXT BLOCK */}
        <div className="text-center lg:text-left lg:max-w-xs shrink-0">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-red-400 font-bold text-xs uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-red-500/30">Live Now</span>
          </div>
          <h3 className="text-3xl md:text-4xl font-title text-white mb-2 drop-shadow-md leading-none">{dropsData.title}</h3>
          {/* CHANGED: Text color to subtle orange */}
          <p className="text-orange-100/80 font-medium text-sm leading-snug drop-shadow-sm">
            Watch <span className="text-white font-bold">OWCS</span> on Twitch/Youtube until {dropsData.endDate} to earn rewards!
          </p>
        </div>

        {/* 2. REWARDS GRID */}
        <div className="flex-1 flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {dropsData.rewards.map((reward, index) => (
                <div key={index} className="flex flex-col items-center relative group/reward">
                    {/* Icon Box - CHANGED hover border to Orange */}
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-neutral-900/60 backdrop-blur-md rounded-xl border border-orange-500/30 flex items-center justify-center shadow-lg transition-all group-hover/reward:border-orange-400 group-hover/reward:scale-110 group-hover/reward:bg-orange-900/40">
                        <img src={reward.image} alt={reward.name} className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-xl" />
                    </div>
                    
                    {/* Badge - CHANGED to Orange */}
                    <span className="absolute -bottom-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-orange-400">
                        {reward.hours}h
                    </span>
                </div>
            ))}
        </div>

        {/* 3. BUTTON - CHANGED to White/Orange */}
        <div className="lg:w-auto shrink-0">
            <a 
            href={dropsData.streamLink} 
            target="_blank" 
            rel="noreferrer"
            className="inline-block px-8 py-4 bg-white text-orange-900 font-black font-title text-xl uppercase tracking-wide rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-105 transition-all whitespace-nowrap hover:bg-orange-50"
            >
            Watch Now
            </a>
        </div>

      </div>
    </div>
  );
}