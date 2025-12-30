import { useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function UserInspector() {
  const [query, setQuery] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setUserData(null);
    
    // 1. Find Profile (Case insensitive search)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .single();

    if (profile) {
      setUserData(profile);
      // 2. Get their Portfolio
      const { data: port } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', profile.id);
      
      if (port) setPortfolio(port);
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">👁️</div>
          <div>
            <h2 className="text-purple-400 font-bold uppercase tracking-wide text-sm">The Panopticon</h2>
            <div className="text-[10px] text-neutral-500 font-mono">User Surveillance</div>
          </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search Username..." 
          className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white w-full focus:border-purple-500 outline-none font-mono"
        />
        <button onClick={handleSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold text-xs uppercase">
          {loading ? '...' : 'Scan'}
        </button>
      </div>

      {userData ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {/* User Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-3 rounded border border-white/5">
                    <div className="text-neutral-500 uppercase font-bold text-[10px]">ID</div>
                    <div className="font-mono text-purple-300 truncate">{userData.id}</div>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/5">
                    <div className="text-neutral-500 uppercase font-bold text-[10px]">Cash Balance</div>
                    <div className="font-mono text-emerald-400 font-bold">${userData.cash.toFixed(2)}</div>
                </div>
            </div>

            {/* Portfolio Dump */}
            <div className="bg-black/30 rounded border border-white/5 p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="text-neutral-500 border-b border-white/5">
                            <th className="pb-2">Asset</th>
                            <th className="pb-2 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-neutral-300">
                        {portfolio.map(p => (
                            <tr key={p.team_name} className="border-b border-white/5">
                                <td className="py-2">{p.team_name}</td>
                                <td className="py-2 text-right">{p.quantity.toFixed(4)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {portfolio.length === 0 && <div className="text-center text-neutral-600 py-4">No assets found.</div>}
            </div>
            
            <div className="pt-2 border-t border-white/5">
               <button className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded text-[10px] font-bold uppercase">
                  ⚠️ Emergency: Reset Cash to $1000
               </button>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-neutral-700 text-xs font-mono border border-dashed border-white/5 rounded">
            // AWAITING TARGET INPUT
        </div>
      )}
    </div>
  );
}