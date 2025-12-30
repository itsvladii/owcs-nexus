import { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

interface LeaderboardEntry {
  username: string;
  net_worth: number;
  season_points: number;
  top_asset: string | null;
  asset_icon: string | null;
}

export default function TradersLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Toggle State: 'sprint' (Live Net Worth) vs 'season' (Permanent Points)
  const [mode, setMode] = useState<'sprint' | 'season'>('sprint');

  useEffect(() => {
    async function loadData() {
      // 1. Identify "You"
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
         if (profile) setCurrentUser(profile.username);
      }

      // 2. Fetch Data
      const { data, error } = await supabase.rpc('get_global_leaderboard');
      
      if (!error && data) {
         // Data transform: Ensure season_points exists (fallback to 0 if null)
         const enriched = data.map((d: any) => ({
            ...d,
            season_points: d.season_points || 0 
         }));
         setLeaders(enriched);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // SORTING LOGIC: Re-sort the list based on which tab is active
  const sortedLeaders = [...leaders].sort((a, b) => {
      if (mode === 'sprint') return b.net_worth - a.net_worth;
      return b.season_points - a.season_points;
  });

  if (loading) return <div className="p-8 text-center text-neutral-500 animate-pulse text-xs">Loading Paddock...</div>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
      
      {/* HEADER & TABS */}
      <div className="p-4 border-b border-white/5 bg-gradient-to-r from-neutral-900 to-neutral-950 shrink-0">
        
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
               🏆 Traders Cup
            </h3>
            
        </div>

        {/* MODE SWITCHER */}
        <div className="flex p-1 bg-black/40 rounded-lg border border-white/5">
            <button
                onClick={() => setMode('sprint')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                    mode === 'sprint' 
                    ? 'bg-neutral-700 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
            >
                Live Sprint
            </button>
            <button
                onClick={() => setMode('season')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                    mode === 'season' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
            >
                Season Standings
            </button>
        </div>
      </div>

      {/* LEADERBOARD LIST */}
      <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar flex-1 bg-neutral-900/50">
        {sortedLeaders.map((trader, index) => {
          const rank = index + 1;
          const isMe = trader.username === currentUser;

          // Rank & Row Styling
          let rankColor = 'text-neutral-500';
          let rowBg = 'hover:bg-white/[0.02]';
          let rankDisplay = <span className="font-mono text-sm opacity-50">{rank}</span>;

          // Podium Medals
          if (rank === 1) { 
              rankColor = 'text-yellow-400'; 
              rowBg = 'bg-gradient-to-r from-yellow-500/10 to-transparent'; 
              rankDisplay = <span className="text-lg">🥇</span>; 
          }
          if (rank === 2) { 
              rankColor = 'text-neutral-300'; 
              rowBg = 'bg-gradient-to-r from-neutral-500/10 to-transparent'; 
              rankDisplay = <span className="text-lg">🥈</span>; 
          }
          if (rank === 3) { 
              rankColor = 'text-amber-700'; 
              rowBg = 'bg-gradient-to-r from-orange-500/10 to-transparent'; 
              rankDisplay = <span className="text-lg">🥉</span>; 
          }
          
          // Highlight Current User
          if (isMe) rowBg = 'bg-emerald-500/10 border-l-2 border-emerald-500';

          // Calculate "Projected Points" for Season Mode
          // F1 Style: 1st=25, 2nd=18, 3rd=15, then 10, 8, 6, 4, 2, 1
          const nextPoints = index === 0 ? 25 : index === 1 ? 18 : index === 2 ? 15 : Math.max(0, 10 - index);

          return (
            <div key={index} className={`flex items-center gap-3 p-3 transition-all ${rowBg}`}>
              
              {/* RANK */}
              <div className={`w-8 text-center font-bold ${rankColor}`}>
                {rankDisplay}
              </div>

              {/* AVATAR */}
              <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center font-bold text-white text-[10px] border border-white/5 shadow-inner shrink-0 relative">
                {trader.username ? trader.username.substring(0, 2).toUpperCase() : '??'}
                {/* Fake "Online" Status for Top 5 */}
                {index < 5 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-neutral-900" />}
              </div>

              {/* USER INFO */}
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-xs truncate flex items-center gap-2 ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                  {trader.username} 
                  {isMe && <span className="text-[8px] bg-emerald-500 text-black px-1 rounded font-bold">YOU</span>}
                </div>
                
                {/* Flavor Text: "Maining Team X" */}
                <div className="flex items-center gap-2 mt-0.5 opacity-60">
                     {trader.top_asset ? (
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-neutral-400 uppercase">Main:</span>
                            {trader.asset_icon && <img src={trader.asset_icon} className="w-3 h-3 object-contain opacity-70" />}
                            <span className="text-[9px] font-bold text-neutral-300">{trader.top_asset}</span>
                        </div>
                     ) : (
                        <span className="text-[9px] text-neutral-600">Rookie Trader</span>
                     )}
                </div>
              </div>

              {/* STATS COLUMN */}
              <div className="text-right min-w-[80px]">
                {mode === 'sprint' ? (
                    // VIEW 1: LIVE NET WORTH
                    <>
                        <div className="font-mono font-bold text-white text-xs">
                           ${trader.net_worth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className={`text-[9px] font-bold ${index % 2 === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {index % 2 === 0 ? '▲ 2.4%' : '▼ 0.8%'}
                        </div>
                    </>
                ) : (
                    // VIEW 2: SEASON POINTS
                    <div className="flex flex-col items-end">
                        <div className="font-black text-white text-sm italic">
                            {trader.season_points} <span className="text-[9px] text-neutral-500 not-italic font-normal">PTS</span>
                        </div>
                        {/* Projected Points Pill */}
                        <div className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 rounded mt-0.5" title="Points you get if race ends now">
                            +{nextPoints} Next
                        </div>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* FOOTER */}
      <div className="p-3 bg-neutral-950 text-center border-t border-white/5 shrink-0">
        <p className="text-[10px] text-neutral-500">
            {mode === 'sprint' 
             ? 'Weekly Sprint ends Sunday @ 23:59 UTC' 
             : 'Season 1 Grand Prize: $0.00 (Bragging Rights)'}
        </p>
      </div>
    </div>
  );
}