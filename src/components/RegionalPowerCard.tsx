import React from 'react';

interface Props {
  regionData: Record<string, number>;
}

export default function RegionalPowerCard({ regionData }: Props) {
  // 1. Sort regions by ELO strength (High to Low)
  const sortedRegions = Object.entries(regionData)
    .filter(([name]) => name !== 'default') // Hide the 'default' fallback
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
      
      {/* Header */}
      <h3 className="text-xl font-title text-white mb-6 border-b border-neutral-800 pb-4 flex items-center justify-between">
        Region Strength
        <span className="text-[10px] font-bold bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 uppercase tracking-wider">
          Coefficient
        </span>
      </h3>
      
      {/* List of Regions */}
      <div className="space-y-5">
        {sortedRegions.map(([region, score], index) => {
           // Color coding for the top regions
           let barColor = "bg-neutral-700";
           let textColor = "text-neutral-500";
           
           if (index === 0) { barColor = "bg-amber-500"; textColor = "text-amber-500"; } // #1 (Gold)
           if (index === 1) { barColor = "bg-blue-500"; textColor = "text-blue-400"; }   // #2 (Blue)
           if (index === 2) { barColor = "bg-emerald-500"; textColor = "text-emerald-400"; } // #3 (Green)

           // Calculate width relative to a "Max" of 1500 (or the top score)
           // This makes the bars look proportional
           const maxScore = 1400; 
           const widthPercent = Math.max(10, Math.min(100, (score / maxScore) * 100));

           return (
             <div key={region} className="flex flex-col gap-1.5">
               <div className="flex justify-between text-sm font-bold items-end">
                 <span className={index === 0 ? "text-white" : "text-neutral-300"}>{region}</span>
                 <span className={`font-mono ${textColor}`}>{Math.round(score)}</span>
               </div>
               
               {/* Visual Bar */}
               <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                 <div 
                   className={`h-full rounded-full ${barColor} transition-all duration-500`} 
                   style={{ width: `${widthPercent}%` }} 
                 ></div>
               </div>
             </div>
           );
        })}
      </div>
      
      {/* Footer Note */}
      <div className="mt-6 pt-4 border-t border-neutral-800">
        <p className="text-xs text-neutral-600 italic leading-relaxed">
          * Base ELO is dynamically calculated based on international performance from the previous season.
        </p>
      </div>

    </div>
  );
}