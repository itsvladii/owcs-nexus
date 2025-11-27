// src/components/RankingsTable.tsx
import React, { useState } from 'react';
import RankingModal from './ELOGraph'; // Assumes you created this from the previous step

export interface RankingTeam {
  rank: number;
  name: string;
  slug: string;
  rating: number;
  wins: number;
  losses: number;
  region: string;
  // Visual props
  logo: string | null;
  color: string;
  isPartner: boolean;
  hasPage: boolean;
  // Data for the modal graph
  history: { date: string; elo: number }[]; 
}

interface Props {
  teams: RankingTeam[];
}

export default function RankingsTable({ teams }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<RankingTeam | null>(null);

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
        
       {/* Header (Unchanged) */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 bg-neutral-950/80 text-neutral-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-7 sm:col-span-6">Team</div>
          <div className="col-span-3 sm:col-span-2 text-center">Rating</div>
          <div className="col-span-3 hidden sm:block text-center">Record</div>
        </div>

        {/* Rows */}
        {teams.map((team) => {
          // --- NEW: Top 3 Styling Logic ---
          let rankColor = "text-neutral-500";
          let rowBg = "";
          let rankIcon = null;
          let TrendIcon = <span className="text-neutral-600">-</span>;
          let trendClass = "text-neutral-600";

          if (team.rank === 1) {
            rankColor = "text-amber-400"; // Gold
            rowBg = "bg-amber-950/10"; // Very subtle gold tint
          } else if (team.rank === 2) {
            rankColor = "text-gray-300"; // Silver
            rowBg = "bg-neutral-800/20";
          } else if (team.rank === 3) {
            rankColor = "text-orange-700"; // Bronze
            rowBg = "bg-orange-950/10";
          }

          if (team.rankDelta && team.rankDelta > 0) {
             TrendIcon = (
               <span className="flex items-center text-xs font-bold">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg>
                 {team.rankDelta}
               </span>
             );
             trendClass = "text-green-500";
          } else if (team.rankDelta && team.rankDelta < 0) {
             TrendIcon = (
               <span className="flex items-center text-xs font-bold">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg>
                 {Math.abs(team.rankDelta)}
               </span>
             );
             trendClass = "text-red-500";
          }
          // --------------------------------

          return (
            <div 
              key={team.name}
              onClick={() => setSelectedTeam(team)}
              className={`
                grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 items-center transition-all cursor-pointer
                ${rowBg} /* Apply Top 3 BG */
                ${team.isPartner ? 'hover:bg-neutral-800/90' : 'hover:bg-neutral-800/50'}
                group relative
              `}
              style={{ 
                // Keep Team Color Border on the left
                borderLeft: team.isPartner ? `4px solid ${team.color}` : `4px solid transparent` 
              }}
            >
              
              {/* Rank (Enhanced) */}
              <div className="col-span-2 sm:col-span-1 text-center flex flex-col items-center justify-center">
                {rankIcon && <span className="text-xs mb-1 animate-pulse">{rankIcon}</span>}
                
                <span className={`font-title text-3xl ${rankColor} group-hover:scale-110 transition-transform leading-none`}>
                  #{team.rank}
                </span>
                
                {/* THE NEW TREND INDICATOR */}
                <div className={`mt-1 ${trendClass}`}>
                   {TrendIcon}
                </div>
              </div>

              {/* Team Name & Logo (Unchanged) */}
              <div className="col-span-7 sm:col-span-6 flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center p-1 shadow-inner flex-shrink-0">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-neutral-400 font-bold text-xs">{team.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-lg font-bold font-title truncate leading-tight ${team.isPartner ? 'text-white' : 'text-neutral-300'}`}>
                    {team.name}
                    {team.isPartner && (
                       <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ backgroundColor: team.color }}></span>
                    )}
                  </span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
                    {team.region}
                  </span>
                </div>
              </div>

              {/* Rating (Unchanged) */}
              <div className="col-span-3 sm:col-span-2 text-center font-mono font-bold text-neutral-300 group-hover:text-amber-400 transition-colors">
                {Math.round(team.rating)}
              </div>

              {/* Record (Unchanged) */}
              <div className="col-span-3 hidden sm:block text-center text-neutral-500 text-sm font-mono">
                {team.wins}W - {team.losses}L
              </div>

            </div>
          );
        })}
        
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
           {/* This 'RankingModal' component handles its own backdrop, 
               but we wrapping it here ensures it's on top of everything. 
               Actually, let's just render it directly since it has a portal-like behavior. 
           */}
           <RankingModal 
             team={selectedTeam} 
             isOpen={!!selectedTeam} 
             onClose={() => setSelectedTeam(null)} 
           />
        </div>
      )}
    </>
  );
}