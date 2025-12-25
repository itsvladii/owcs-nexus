import React, { useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

interface TeamData {
  name: string;
  rating: number; 
}

export default function DividendTrigger({ teams, onSuccess }: { teams: TeamData[], onSuccess: () => void }) {
  const [selectedTeam, setSelectedTeam] = useState(teams[0]?.name || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // 🔥 NEW: Multiplier Selection
  const [matchType, setMatchType] = useState('1.0'); // Default to Standard

  const handleWin = async () => {
    setLoading(true);
    setResult(null);

    const team = teams.find(t => t.name === selectedTeam);
    if (!team) return;

    try {
      const { data, error } = await supabase.rpc('distribute_dividend', {
        p_team_name: team.name,
        p_current_price: team.rating,
        p_payout_multiplier: parseFloat(matchType) // Pass the multiplier
      });

      if (error) throw error;

      setResult(`🎉 ${matchType}x Payout! Paid ${data.users_paid} users a total of $${data.total_distributed.toFixed(2)}`);
      onSuccess(); 
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl mb-8">
      <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
        ⚡ Admin Console: <span className="text-white">Record Win</span>
      </h3>
      
      <div className="flex flex-col md:flex-row gap-3">
        {/* Team Selector */}
        <select 
          className="bg-black text-white border border-neutral-700 rounded px-3 py-2 text-sm flex-1"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        
        {/* Match Type Selector */}
        <select 
            className="bg-black text-white border border-neutral-700 rounded px-3 py-2 text-sm font-bold uppercase w-40"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
        >
            <option value="1.0">Standard (1%)</option>
            <option value="2.0">Qualifier (2%)</option>
            <option value="3.0">Major (3%)</option>
            <option value="5.0">Grand Final (5%)</option>
        </select>
        
        <button
          onClick={handleWin}
          disabled={loading}
          className={`font-bold text-xs uppercase px-4 py-2 rounded transition-all shadow-lg ${
            matchType === '1.0' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
            matchType === '5.0' ? 'bg-amber-500 hover:bg-amber-400 text-black animate-pulse' :
            'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {loading ? 'Paying...' : `Pay Yield`}
        </button>
      </div>
      
      {result && <div className="mt-3 text-xs text-neutral-300 font-mono bg-black/30 p-2 rounded border border-neutral-800">{result}</div>}
    </div>
  );
}