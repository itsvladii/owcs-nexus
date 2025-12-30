import { useState, useEffect } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function MarketOverride() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('teams').select('name, rating').order('name').then(({ data }) => {
       if(data) setTeams(data);
    });
  }, []);

  const handleOverride = async () => {
    if(!selectedTeam || !newPrice) return;
    if(!confirm(`⚠️ FORCE UPDATE: Set ${selectedTeam} to $${newPrice}?`)) return;

    setLoading(true);
    const { error } = await supabase.from('teams').update({ rating: parseFloat(newPrice) }).eq('name', selectedTeam);
    
    if(!error) {
        alert("Price Updated.");
        setNewPrice('');
        // Refresh local data
        setTeams(teams.map(t => t.name === selectedTeam ? {...t, rating: parseFloat(newPrice)} : t));
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-xl">🛠️</div>
          <div>
            <h2 className="text-amber-500 font-bold uppercase tracking-wide text-sm">Market Override</h2>
            <div className="text-[10px] text-neutral-500 font-mono">Emergency Price Fixer</div>
          </div>
      </div>

      <div className="space-y-4">
          <div>
             <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">Target Asset</label>
             <select 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                value={selectedTeam}
                onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    const t = teams.find(x => x.name === e.target.value);
                    if(t) setNewPrice(t.rating.toString());
                }}
             >
                <option value="">-- Select Team --</option>
                {teams.map(t => <option key={t.name} value={t.name}>{t.name} (${t.rating})</option>)}
             </select>
          </div>

          <div>
             <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">Force New Price</label>
             <div className="relative">
                 <span className="absolute left-3 top-2 text-neutral-500">$</span>
                 <input 
                    type="number" 
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-6 pr-3 py-2 text-white text-sm font-mono focus:border-amber-500 outline-none"
                 />
             </div>
          </div>

          <button 
            onClick={handleOverride}
            disabled={loading || !selectedTeam}
            className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase tracking-widest rounded-lg transition-all"
          >
             {loading ? 'Injecting...' : 'Override Protocol'}
          </button>
      </div>
    </div>
  );
}