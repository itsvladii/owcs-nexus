import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface Props {
  team: any;
  isOpen: boolean;
  onClose: () => void;
  matches: any[];
}

/**
 * SMART ABBREVIATOR
 * Turns "Overwatch Champions Series 2026 - North America Stage 1" 
 * into "OWCS NA Stage 1"
 */
function getSmartAbbreviation(name: string): string {
  if (!name) return "";

  let abbr = name
    // 1. Remove redundancy
    .replace(/Overwatch Champions Series/g, 'OWCS')
    .replace(/Overwatch World Cup/g, 'OWWC')
    .replace(/2026/g, '')
    .replace(/2025/g, '')
    
    // 2. Regions
    .replace(/North America/g, 'NA')
    .replace(/Europe, Middle East & North Africa/g, 'EMEA')
    .replace(/Europe/g, 'EU')
    .replace(/Asia/g, 'ASIA')
    .replace(/Korea/g, 'KR')
    .replace(/Japan/g, 'JP')
    .replace(/Pacific/g, 'PAC')
    
    // 3. Stages & Formats
    .replace(/Stage/g, 'Stg')
    .replace(/Season/g, 'S')
    .replace(/Group Stage/g, 'Groups')
    .replace(/Playoffs/g, 'Playoffs')
    .replace(/Midseason/g, 'Midseason')
    .replace(/Championship/g, 'Champ')
    .replace(/Last Chance Qualifier/g, 'LCQ')
    .replace(/Qualifier/g, 'Qual')
    .replace(/Faceit League/g, 'Faceit')
    
    // 4. Cleanup
    .replace(/ - /g, ' ')  // Remove separators
    .replace(/\s+/g, ' ')  // Remove double spaces
    .trim();

  return abbr;
}

export default function RankingModal({ team, isOpen, onClose, matches }: Props) {
  const [mounted, setMounted] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // --- 1. FILTER & SORT ---
  const teamHistory = useMemo(() => {
    if (!team || !matches) return [];
    return matches
      .filter(m => m.team_a === team.name || m.team_b === team.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [team, matches]);

  // --- 2. GRAPH CONFIG ---
  const chartConfig = useMemo(() => {
    if (!team || !team.history) return null;
    
    const sortedHistory = [...team.history].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const dataPoints = sortedHistory.map((h: any) => ({
        x: new Date(h.date).getTime(),
        y: Math.round(h.elo)
    }));

    // Add current live rating if needed
    if (dataPoints.length === 0) {
        dataPoints.push({ x: Date.now(), y: Math.round(team.rating) });
    }

    return {
      series: [{ name: "Rating", data: dataPoints }],
      options: {
        chart: {
          type: 'area',
          background: 'transparent',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { enabled: true, easing: 'easeinout', speed: 800 }
        },
        theme: { mode: 'dark' },
        stroke: { curve: 'smooth', width: 2, colors: ['#22c55e'] },
        markers: { size: 0, hover: { size: 5 } },
        dataLabels: { enabled: false },
        fill: {
           type: 'gradient',
           gradient: {
             shadeIntensity: 1,
             opacityFrom: 0.4,
             opacityTo: 0.05,
             stops: [0, 100],
             colorStops: [{ offset: 0, color: '#22c55e', opacity: 0.4 }, { offset: 100, color: '#22c55e', opacity: 0 }]
           }
        },
        grid: { show: true, borderColor: '#262626', strokeDashArray: 0, position: 'back' },
        xaxis: {
          type: 'datetime',
          tooltip: { enabled: false },
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: '#525252', fontFamily: 'monospace', fontSize: '10px' }, format: 'dd MMM' }
        },
        yaxis: {
          labels: { style: { colors: '#525252', fontFamily: 'monospace', fontSize: '10px' }, formatter: (val) => val.toFixed(0) },
          forceNiceScale: true,
          opposite: true
        },
        tooltip: { 
          theme: 'dark', 
          x: { format: 'dd MMM yyyy' },
          y: { formatter: (val) => `${val} PTS` },
          style: { fontFamily: 'monospace' },
          marker: { show: false }
        }
      } as ApexOptions
    };
  }, [team]);

  if (!mounted || !isOpen || !team) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900 shrink-0 flex justify-between items-center z-10">
          <div className="flex items-center gap-5">
             {team.logo && (
                 <img src={team.logo} alt={team.name} className="w-16 h-16 object-contain drop-shadow-lg" />
             )}
             <div>
                 <h2 className="text-3xl font-bold font-title text-white font-tungsten uppercase tracking-wide leading-none">{team.name}</h2>
                 <div className="flex gap-4 text-sm font-mono mt-2">
                     <span className="text-neutral-400">Rating: <b className="text-white">{Math.round(team.rating)}</b></span>
                     <span className="text-neutral-400">Record: <b className="text-white">{team.wins}W - {team.losses}L</b></span>
                 </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto custom-scrollbar flex-1 bg-neutral-950/50">
           
           {/* Graph */}
           <div className="h-72 w-full p-4 border-b border-neutral-800 bg-neutral-900/30">
                {chartConfig && (
                    <Chart options={chartConfig.options} series={chartConfig.series} type="area" height="100%" width="100%" />
                )}
           </div>

           {/* Match Log */}
           <div className="p-6">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 sticky top-0 bg-neutral-950/95 py-2 z-10 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Match Log
              </h3>
              
              {teamHistory.length === 0 ? (
                  <div className="text-center py-12 text-neutral-600 italic border border-dashed border-neutral-800 rounded-xl">
                      No matches recorded yet.
                  </div>
              ) : (
                  <div className="space-y-0">
                      {teamHistory.map((m) => {
                          const isTeamA = m.team_a === team.name;
                          const opponent = isTeamA ? m.team_b : m.team_a;
                          const myScore = isTeamA ? m.score_a : m.score_b;
                          const opScore = isTeamA ? m.score_b : m.score_a;
                          const rawChange = isTeamA ? m.elo_change_a : m.elo_change_b;
                          const change = Math.round(rawChange);
                          const isWin = (m.winner_id === '1' && isTeamA) || (m.winner_id === '2' && !isTeamA) || (myScore > opScore);
                          const tourneyAbbr = getSmartAbbreviation(m.tournament);
                          const isExpanded = expandedMatchId === m.id;

                          return (
                              <div key={m.id} className="border-b border-neutral-800/50 last:border-0">
                                  
                                  {/* --- MAIN ROW (Clickable) --- */}
                                  <div 
                                    onClick={() => m.details ? setExpandedMatchId(isExpanded ? null : m.id) : null}
                                    className={`grid grid-cols-12 gap-2 items-center py-3 px-2 transition-colors group ${m.details ? 'cursor-pointer hover:bg-white/5' : ''}`}
                                  >
                                      
                                      {/* Date & Tournament */}
                                      <div className="col-span-3 sm:col-span-3 flex flex-col justify-center pl-2">
                                          <span className="text-xs text-neutral-400 font-mono group-hover:text-neutral-300 transition-colors">
                                              {new Date(m.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                          </span>
                                          <span className="text-[10px] text-neutral-600 font-medium truncate uppercase tracking-tight mt-0.5 group-hover:text-neutral-500">
                                              {tourneyAbbr}
                                          </span>
                                      </div>

                                      {/* Result */}
                                      <div className="col-span-1 text-center">
                                          <span className={`text-xs font-bold font-mono ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                              {isWin ? 'W' : 'L'}
                                          </span>
                                      </div>

                                      {/* Opponent */}
                                      <div className="col-span-5 sm:col-span-4 font-bold text-white text-sm truncate flex items-center gap-2">
                                          <span className="text-neutral-700 text-[10px] uppercase font-normal hidden sm:inline">vs</span>
                                          <span className="group-hover:text-white text-neutral-200 transition-colors">{opponent}</span>
                                      </div>

                                      {/* Score */}
                                      <div className="col-span-3 sm:col-span-2 text-center text-sm font-mono text-neutral-400 group-hover:text-white transition-colors">
                                          {myScore} - {opScore}
                                      </div>

                                      {/* Elo Change */}
                                      <div className={`col-span-12 sm:col-span-2 text-right font-mono font-bold text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'} sm:border-0 flex justify-end items-center gap-2`}>
                                          <span>{change > 0 ? '+' : ''}{change}</span>
                                          {/* Expansion Chevron */}
                                          {m.details && (
                                              <span className={`text-[10px] text-neutral-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                          )}
                                      </div>
                                  </div>

                                  {/* --- EXPANDED DETAILS (The "Alpha") --- */}
                                  {isExpanded && m.details && (
                                      <div className="bg-neutral-950/40 border-t border-neutral-800/50 p-4 animate-in slide-in-from-top-1 duration-200">
                                          
                                          {/* MVP Badge */}
                                          {m.details.mvp && (
                                              <div className="mb-3 flex items-center gap-2">
                                                  <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">MVP</span>
                                                  <span className="text-xs font-mono text-neutral-300">{m.details.mvp}</span>
                                              </div>
                                          )}

                                          {/* Map Breakdown Grid */}
                                          <div className="space-y-1">
                                              {m.details.maps.map((map: any, idx: number) => {
                                                  const isMapWin = (map.winner === '1' && isTeamA) || (map.winner === '2' && !isTeamA);
                                                  
                                                  return (
                                                      <div key={idx} className="flex items-center justify-between text-xs font-mono p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-neutral-800">
                                                          <div className="flex items-center gap-3">
                                                              {/* Status Bar */}
                                                              <div className={`w-1 h-8 rounded-full ${isMapWin ? 'bg-green-500/80' : 'bg-red-500/80'}`}></div>
                                                              
                                                              <div className="flex flex-col">
                                                                  <span className="text-neutral-200 font-bold">{map.name}</span>
                                                                  <span className="text-[9px] text-neutral-600 uppercase tracking-wide">{map.mode}</span>
                                                              </div>
                                                          </div>

                                                          <div className="flex items-center gap-3">
                                                              {/* Bans */}
                                                              {map.bans && map.bans.length > 0 && (
                                                                  <div className="flex gap-1">
                                                                      {map.bans.map((ban: string) => (
                                                                          <span key={ban} className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[9px] text-neutral-500 line-through decoration-red-500/40" title="Banned Hero">
                                                                              {ban}
                                                                          </span>
                                                                      ))}
                                                                  </div>
                                                              )}
                                                              
                                                              {/* Score */}
                                                              <span className={`w-14 text-right font-bold ${isMapWin ? 'text-green-400' : 'text-red-400'}`}>
                                                                  {map.score}
                                                              </span>
                                                          </div>
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              )}
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}