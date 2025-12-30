import { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function EconomyStats() {
  const [stats, setStats] = useState({ totalUsers: 0, totalCash: 0, richestUser: '' });

  useEffect(() => {
    async function load() {
       const { data: profiles } = await supabase.from('profiles').select('username, cash');
       if(profiles) {
           const totalCash = profiles.reduce((sum, p) => sum + p.cash, 0);
           const richest = profiles.sort((a,b) => b.cash - a.cash)[0];
           setStats({
               totalUsers: profiles.length,
               totalCash,
               richestUser: richest?.username || 'None'
           });
       }
    }
    load();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-900 border border-white/10 p-4 rounded-xl">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Total Users</div>
            <div className="text-2xl font-mono text-white">{stats.totalUsers}</div>
        </div>
        <div className="bg-neutral-900 border border-white/10 p-4 rounded-xl">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Global Liquidity</div>
            <div className="text-2xl font-mono text-emerald-400">${(stats.totalCash / 1000).toFixed(1)}k</div>
        </div>
        <div className="bg-neutral-900 border border-white/10 p-4 rounded-xl">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Top Whale</div>
            <div className="text-lg font-mono text-amber-400 truncate">{stats.richestUser}</div>
        </div>
    </div>
  );
}