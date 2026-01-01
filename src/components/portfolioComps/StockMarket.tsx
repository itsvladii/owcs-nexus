import { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import BuyStockModal from './BuyStockModal'; 
import MarketHeatmap from './MarketHeatmap';

// --- CONFIGURATION ---
const MIN_GAMES = 10;          
const MIN_RATING = 100.0;      
const INACTIVITY_DAYS = 90;   

interface Team {
  name: string;
  rating: number;
  region: string;
  logo: string | null;
  logo_dark?: string | null;
  form: string | string[]; 
  wins: number;
  losses: number;
  history: any[];
  tier?: string;
}

function getRiskRating(elo: number) {
  if (elo >= 160.0) return { grade: 'AAA', label: 'Prime', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' };
  if (elo >= 140.0) return { grade: 'AA', label: 'High Grade', color: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10' };
  if (elo >= 130.0) return { grade: 'A', label: 'Upper Med', color: 'text-blue-400 border-blue-500/50 bg-blue-500/10' };
  if (elo >= 120.0) return { grade: 'BBB', label: 'Lower Med', color: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' };
  return { grade: 'CCC', label: 'Speculative', color: 'text-rose-400 border-rose-500/50 bg-rose-500/10' };
}

export default function StockMarket() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetchMarket();
  }, []);

  const fetchMarket = async () => {
    try {
      setLoading(true);
      const { data: latestMatch } = await supabase.from('matches').select('date').order('date', { ascending: false }).limit(1).single();
      const referenceDate = latestMatch ? new Date(latestMatch.date) : new Date();
      const cutoffDate = new Date(referenceDate);
      cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);
      const isoCutoff = cutoffDate.toISOString();

      const [teamsResponse, matchesResponse] = await Promise.all([
        supabase.from('teams').select('*').gte('rating', MIN_RATING).gt('wins', 0).order('rating', { ascending: false }),
        supabase.from('matches').select('team_a, team_b').gte('date', isoCutoff)
      ]);

      if (teamsResponse.error) throw teamsResponse.error;

      const activeTeamNames = new Set<string>();
      matchesResponse.data?.forEach(m => {
        if (m.team_a) activeTeamNames.add(m.team_a);
        if (m.team_b) activeTeamNames.add(m.team_b);
      });

      const filteredTeams = (teamsResponse.data || []).filter((t: any) => {
        const totalGames = (t.wins || 0) + (t.losses || 0);
        if (totalGames < MIN_GAMES) return false;
        if (activeTeamNames.size > 0 && !activeTeamNames.has(t.name)) return false;
        return true;
      }).map((t: any) => ({
          ...t,
          tier: getRiskRating(t.rating).grade 
      }));

      setTeams(filteredTeams);
    } catch (err) {
      console.error('Market load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-neutral-500 animate-pulse">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"/>
      <div className="text-sm font-mono uppercase tracking-widest">Synchronizing Market...</div>
    </div>
  );

  return (
    <>
      {/* 1. CONTROL BAR */}
      <div className="flex items-center justify-between md:justify-end mb-4">
          <div className="text-xs font-bold text-neutral-400 md:hidden">
            {teams.length} Active Teams
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase font-bold text-neutral-500 hidden md:block">Layout</span>
             <div className="bg-neutral-900 border border-white/5 rounded-lg p-1 flex">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`} title="List View">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <button onClick={() => setViewMode('map')} className={`p-2 rounded transition-all ${viewMode === 'map' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`} title="Heatmap View">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
             </div>
          </div>
      </div>

      {/* 2. MAIN VIEW */}
      {viewMode === 'map' ? (
          <MarketHeatmap teams={teams} onTeamClick={(team) => setSelectedTeam(team)} />
      ) : (
          <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl ring-1 ring-black/50 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col">
            
            {/* SCROLLABLE WRAPPER */}
            <div className="overflow-x-auto custom-scrollbar">
                {/* MIN-WIDTH CONTAINER: Forces layout to be wide enough */}
                <div className="min-w-[900px]">
                    
                    {/* TABLE HEADER */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 text-[10px] uppercase font-bold text-neutral-500 tracking-wider sticky top-0 z-10">
                      <div className="col-span-1">Rank</div>
                      <div className="col-span-4">Team</div>
                      <div className="col-span-2">Rating</div>
                      <div className="col-span-2 text-center">Form</div>
                      <div className="col-span-2 text-right">Price</div>
                      <div className="col-span-1 text-right"></div>
                    </div>

                    {/* TABLE BODY */}
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                      {teams.map((team, index) => {
                        const formArray = typeof team.form === 'string' ? JSON.parse(team.form) : team.form;
                        const rating = getRiskRating(team.rating);

                        return (
                          <div key={team.name} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group">
                            {/* RANK */}
                            <div className="col-span-1 font-mono text-neutral-600 text-xs group-hover:text-neutral-400">#{index + 1}</div>

                            {/* TEAM */}
                            <div className="col-span-4 flex items-center gap-3">
                              {team.logo ? (
                                <img src={team.logo_dark || team.logo} alt={team.name} className="w-8 h-8 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                              ) : (
                                <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center text-xs text-neutral-500 font-bold">?</div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">{team.name}</div>
                                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{team.region || 'Global'}</div>
                              </div>
                            </div>

                            {/* RATING */}
                            <div className="col-span-2 flex items-center">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider w-fit ${rating.color}`}>
                                <span className="text-xs">{rating.grade}</span>
                                <span className="opacity-75 border-l border-white/20 pl-2">{rating.label}</span>
                              </div>
                            </div>

                            {/* FORM */}
                            <div className="col-span-2 flex justify-center items-center gap-1">
                              {Array.isArray(formArray) && formArray.map((result: string, i: number) => (
                                <div key={i} className={`w-1 h-5 rounded-full transition-all ${result === 'W' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-neutral-800'}`} />
                              ))}
                              {(!formArray || formArray.length === 0) && <span className="text-neutral-700 text-xs">-</span>}
                            </div>

                            {/* PRICE */}
                            <div className="col-span-2 text-right">
                              <div className="font-mono text-emerald-400 font-bold text-sm drop-shadow-sm">₵{team.rating.toFixed(2)}</div>
                            </div>

                            {/* BUTTON */}
                            <div className="col-span-1 text-right">
                              <button onClick={() => setSelectedTeam(team)} className="bg-white text-black hover:bg-emerald-400 hover:text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95">Trade</button>
                            </div>

                          </div>
                        );
                      })}
                      
                      {teams.length === 0 && (
                        <div className="p-10 text-center text-neutral-500 italic">No active teams found.</div>
                      )}
                    </div>
                </div>
            </div>
          </div>
      )}

      {selectedTeam && (
        <BuyStockModal 
          team={selectedTeam} 
          onClose={() => setSelectedTeam(null)}
          onSuccess={() => setSelectedTeam(null)} 
        />
      )}
    </>
  );
}