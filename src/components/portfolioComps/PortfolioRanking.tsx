import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  start_balance: number;
  current_net_worth: number;
  percentage_gain: number;
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const { data: lb, error } = await supabase.rpc('get_weekly_leaderboard');
      if (lb) setData(lb);
      setLoading(false);
    };
    loadLeaderboard();
  }, []);

  if (loading) return <div className="p-4 text-center text-neutral-500 text-xs">Loading rankings...</div>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
        <div>
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Weekly Sprint 🏆</h3>
            <p className="text-[10px] text-neutral-500">Resets every Monday</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-bold uppercase">
            Top 50
        </div>
      </div>
      
      <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/50 text-[10px] text-neutral-500 uppercase font-bold sticky top-0 backdrop-blur-md">
                <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Trader</th>
                    <th className="p-3 text-right">Gain</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {data.map((entry, i) => (
                    <tr key={entry.user_id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 ${i < 3 ? 'bg-gradient-to-r from-emerald-900/10 to-transparent' : ''}`}>
                        <td className="p-3 font-mono text-neutral-500 w-12">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </td>
                        <td className="p-3 font-bold text-neutral-300">
                            {entry.username}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${entry.percentage_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.percentage_gain > 0 ? '+' : ''}{entry.percentage_gain.toFixed(2)}%
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
      </div>
    </div>
  );
}