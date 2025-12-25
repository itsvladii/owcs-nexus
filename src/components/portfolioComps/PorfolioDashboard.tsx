import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import TradePanel from './TradePannel';
import DividendTrigger from './DividendTrigger';
import Leaderboard from './PortfolioRanking';
import type { User } from '@supabase/supabase-js';
import { getRiskRating } from '../../lib/contentScripts/marketRating';

// --- INTERFACES ---
interface TeamData {
  name: string;
  rating: number;
  logo?: string | null;
  region?: string | null;
  history?: { date: string; elo: number }[];
}

interface PortfolioDashboardProps {
  currentPrices: Record<string, number>;
  allTeams: TeamData[];
}

interface Transaction {
  id: number;
  type: string;
  team_name: string;
  price: number; // This stores the TOTAL payout for dividends
  created_at: string;
}

export default function PortfolioDashboard({ currentPrices, allTeams }: PortfolioDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [cash, setCash] = useState(0);
  const [holdingsMap, setHoldingsMap] = useState<Record<string, number>>({});
  const [recentDividends, setRecentDividends] = useState<Transaction[]>([]); // <--- NEW STATE
  
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData(session.user.id);
    });
  }, []);

  const fetchData = async (userId: string) => {
    // 1. Get Cash
    const { data: profile } = await supabase.from('profiles').select('cash').eq('id', userId).single();
    if (profile) setCash(profile.cash);

    // 2. Get Holdings
    const { data: portfolio } = await supabase.from('portfolio').select('team_name, quantity').eq('user_id', userId);
    const map: Record<string, number> = {};
    portfolio?.forEach((p: any) => map[p.team_name] = p.quantity);
    setHoldingsMap(map);

    // 3. Get Recent Dividends (Last 5)
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'DIVIDEND')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txs) setRecentDividends(txs);
  };

  const filteredTeams = allTeams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!user) return <div className="p-10 text-center">Please Login</div>;

  return (
    <div className="max-w-7xl mx-auto relative min-h-screen">
      
      {/* 🛠️ ADMIN TRIGGER (Only for testing) */}
      <DividendTrigger teams={allTeams} onSuccess={() => fetchData(user.id)} />

      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
          <div className="text-xs font-bold text-neutral-500 uppercase">Cash Available</div>
          <div className="text-3xl font-mono text-white font-bold">${cash.toLocaleString()}</div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
          <div className="text-xs font-bold text-neutral-500 uppercase">Assets Owned</div>
          <div className="text-3xl font-mono text-white font-bold">{Object.keys(holdingsMap).length}</div>
        </div>
        {/* RECENT PAYOUTS CARD */}
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 relative overflow-hidden">
          <div className="text-xs font-bold text-emerald-500 uppercase mb-2">Recent Payouts</div>
          <div className="space-y-2">
            {recentDividends.length === 0 ? (
                <div className="text-neutral-600 text-sm italic">No dividends yet</div>
            ) : (
                recentDividends.map(tx => (
                    <div key={tx.id} className="flex justify-between text-sm">
                        <span className="text-white font-bold">{tx.team_name} Win</span>
                        <span className="font-mono text-emerald-400">+{tx.price.toFixed(2)}</span>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Search for a team to trade..." 
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* MARKET LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
        
        {/* LEFT COLUMN: Market List (Takes 2/3 width) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
          {/* ... This is exactly the code you pasted ... */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left relative">
              <thead className="bg-black text-neutral-500 text-xs uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-4 bg-black">Team</th>
                  <th className="p-4 bg-black">Rating</th>
                  <th className="p-4 text-right bg-black">Price</th>
                  <th className="p-4 text-right bg-black">Owned</th>
                  <th className="p-4 text-right bg-black">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredTeams.map(team => {
                  const owned = holdingsMap[team.name] || 0;
                  const rating = getRiskRating(team.rating * 10);
                  return (
                    <tr key={team.name} className="hover:bg-neutral-800/50 transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        {team.logo && <img src={team.logo} className="w-8 h-8 object-contain" />}
                        <span className="font-bold text-white">{team.name}</span>
                      </td>
                      <td className="p-4">
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider w-fit ${rating.color}`}>
            <span className="text-xs">{rating.grade}</span>
            <span className="opacity-75 hidden md:inline border-l border-white/20 pl-2">{rating.label}</span>
        </div>
      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        ${team.rating.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {owned > 0 ? (
                          <span className="bg-neutral-800 px-2 py-1 rounded text-xs font-bold text-white">
                            {Number(owned).toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedTeam(team)}
                          className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-400 transition-colors"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Leaderboard (Takes 1/3 width) */}
        <div className="lg:col-span-1 h-full">
           <Leaderboard />
        </div>

      </div>

      {/* TRADE DRAWER */}
      {selectedTeam && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setSelectedTeam(null)} />
          <TradePanel 
            team={selectedTeam}
            userCash={cash}
            userHoldings={holdingsMap}
            onClose={() => setSelectedTeam(null)}
            onSuccess={() => fetchData(user.id)}
          />
        </>
      )}

    </div>
  );
}