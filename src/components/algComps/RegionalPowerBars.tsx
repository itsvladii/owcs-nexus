// src/components/docs/RegionalPowerBars.tsx
import React from 'react';

const STARTING_ELO = {
  "Korea": 1454,
  "EMEA": 1398,
  "North America": 1312,
  "Japan": 1304,
  "China": 1282,
  "Pacific": 1240,
  "default": 1200
};

const REGION_COLORS: Record<string, string> = {
  "Korea": "#6eff18",
  "North America": "#823bf2",
  "EMEA": "#54c4c4",
  "Pacific": "#58cdff",
  "China": "#f7c525",
  "Japan": "#ec0201",
};

export default function RegionalPowerBars() {
  const maxElo = STARTING_ELO["Korea"]; //

  return (
    <div className="not-prose my-12 p-6 backdrop-blur-md">

      <div className="space-y-6">
        {Object.entries(STARTING_ELO).map(([region, elo]) => {
          const color = REGION_COLORS[region] || "#737373";
          const widthPercent = (elo / maxElo) * 100;

          return (
            <div key={region} className="group">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-tighter">
                  {region}
                </span>
                <span 
                  className="font-mono text-sm font-black"
                  style={{ color: color }}
                >
                  {elo}
                </span>
              </div>
              
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                  style={{ 
                    width: `${widthPercent}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}33`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="mt-6 text-[9px] font-mono text-neutral-600 uppercase leading-relaxed italic text-center">
        * Based on historical re-simulation of previous pro seasons.
      </p>
    </div>
  );
}