import React, { useState, useMemo } from 'react';
import RankingModal from './ELOGraph';

export interface RankingTeam {
  rank: number;
  name: string;
  slug: string;
  rating: number;
  wins: number;
  losses: number;
  region: string;
  logo: string | null;
  color: string;
  isPartner: boolean;
  hasPage: boolean;
  history: { date: string; elo: number }[];
  tournaments: string[];
  rankDelta?: number;
}

interface Props {
  teams: RankingTeam[];
}

// Filter Options
const EVENT_FILTERS = [
  { label: 'All Events', value: 'All' },
  { label: 'World Finals', value: 'World Finals 2025' },
  { label: 'Midseason', value: 'Midseason Championship' },
  { label: 'Champions Clash', value: 'Champions Clash' }
];

const REGION_FILTERS = ['All Regions', 'Korea', 'North America', 'EMEA', 'China', 'Pacific', 'Japan'];

export default function RankingsTable({ teams }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<RankingTeam | null>(null);
  const [regionFilter, setRegionFilter] = useState('All Regions');
  const [eventFilter, setEventFilter] = useState('All');

  // --- FILTER LOGIC ---
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // 1. Region Filter
      if (regionFilter !== 'All Regions' && team.region !== regionFilter) {
        return false;
      }
      // 2. Event Filter
      if (eventFilter !== 'All') {
        const playedInEvent = team.tournaments.some(t => t.includes(eventFilter));
        if (!playedInEvent) return false;
      }
      return true;
    });
  }, [teams, regionFilter, eventFilter]);

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm relative z-10">
        
        {/* --- FILTER BAR (Restored) --- */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-4">
             {/* Region Select */}
             <div className="relative">
                <select 
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="appearance-none bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg pl-4 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                >
                  {REGION_FILTERS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
             </div>

             {/* Event Select */}

           </div>

           <span className="text-xs text-neutral-500 font-mono">
              Showing {filteredTeams.length} Teams
           </span>
        </div>

        {/* --- TABLE HEADER --- */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 bg-neutral-950/80 text-neutral-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-7 sm:col-span-6">Team</div>
          <div className="col-span-3 sm:col-span-2 text-center">Rating</div>
          <div className="col-span-3 hidden sm:block text-center">Record</div>
        </div>

        {/* --- ROWS --- */}
        {filteredTeams.length > 0 ? filteredTeams.map((team) => {
          
          // 1. Top 3 Styling
          let rankColor = "text-neutral-500";
          let rowBg = "";
          let rankIcon = null;

          if (team.rank === 1) { rankColor = "text-amber-400"; rowBg = "bg-amber-950/10"; rankIcon = "🏆"; }
          else if (team.rank === 2) { rankColor = "text-gray-300"; rowBg = "bg-neutral-800/20"; }
          else if (team.rank === 3) { rankColor = "text-orange-700"; rowBg = "bg-orange-950/10"; }

          // 2. Trend Logic
          let TrendIcon = null;
          let trendClass = "text-neutral-600";
          if (team.rankDelta && team.rankDelta > 0) {
             TrendIcon = <span className="flex items-center gap-0.5"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg>{team.rankDelta}</span>;
             trendClass = "text-green-500";
          } else if (team.rankDelta && team.rankDelta < 0) {
             TrendIcon = <span className="flex items-center gap-0.5"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg>{Math.abs(team.rankDelta)}</span>;
             trendClass = "text-red-500";
          }

          return (
            <div 
              key={team.name}
              onClick={() => setSelectedTeam(team)}
              className={`
                grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 items-center transition-all cursor-pointer
                ${rowBg}
                ${team.isPartner ? 'hover:bg-neutral-800/90' : 'hover:bg-neutral-800/50'}
                group relative
              `}
              style={{ borderLeft: team.isPartner ? `4px solid ${team.color}` : `4px solid transparent` }}
            >
              
              {/* Rank */}
              <div className="col-span-2 sm:col-span-1 text-center flex flex-col items-center justify-center">
                {rankIcon && <span className="text-xs mb-1 animate-pulse">{rankIcon}</span>}
                <span className={`font-title text-3xl ${rankColor} group-hover:scale-110 transition-transform leading-none`}>
                  #{team.rank}
                </span>
                {TrendIcon && <div className={`text-[10px] font-bold mt-1 ${trendClass}`}>{TrendIcon}</div>}
              </div>

              {/* Team */}
              <div className="col-span-7 sm:col-span-6 flex items-center gap-4">
                <div className="w-10 h-10 items-center justify-center p-1 shadow-inner flex-shrink-0">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-neutral-400 font-bold text-xs">{team.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-lg font-bold truncate leading-tight ${team.isPartner ? 'text-white' : 'text-neutral-300'}`}>
                    {team.name}
                    {team.isPartner && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ backgroundColor: team.color }}></span>}
                  </span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
                    {team.region}
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div className="col-span-3 sm:col-span-2 text-center font-mono font-bold text-neutral-300 group-hover:text-amber-400 transition-colors">
                {Math.round(team.rating)}
              </div>

              {/* Record */}
              <div className="col-span-3 hidden sm:block text-center text-neutral-500 text-sm font-mono">
                {team.wins}W - {team.losses}L
              </div>

            </div>
          );
        }) : (
           <div className="p-12 text-center text-neutral-500">
             No teams found matching these filters.
           </div>
        )}

      </div>

      {/* Modal */}
      {selectedTeam && (
        <RankingModal 
          team={selectedTeam} 
          isOpen={!!selectedTeam} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}
    </>
  );
}