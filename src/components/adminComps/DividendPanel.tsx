import { useState, useEffect } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

interface Team {
  name: string;
  rating: number;
  region: string;
}

export default function DividendPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [multiplier, setMultiplier] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  // 1. Fetch real teams from your database
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase
        .from('teams')
        .select('name, rating, region')
        .order('name');
      
      if (data) {
        setTeams(data);
        setSelectedTeam(data[0]?.name || '');
      }
    }
    loadTeams();
  }, []);

  // 2. The Payout Button Action
  const handlePayout = async () => {
    if (!selectedTeam) return;
    
    // Safety Confirm
    const confirmMsg = `CONFIRM PAYOUT:\n\nTeam: ${selectedTeam}\nMultiplier: ${multiplier}x\n\nAre you sure?`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setLog('⏳ Processing transactions...');

    try {
      const { data, error } = await supabase.rpc('distribute_dividend', {
        p_team_name: selectedTeam,
        p_payout_multiplier: parseFloat(multiplier)
      });

      if (error) throw error;

      setLog(`✅ SUCCESS!\nPaid ₵${data.total_distributed.toFixed(2)} to ${data.users_paid} shareholders.\n(Based on stock price: ₵${data.price_used})`);
    } catch (err: any) {
      setLog(`❌ ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl max-w-lg w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-500/10 p-3 rounded-lg">
          <span className="text-2xl">💸</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Dividend Dispatcher</h2>
          <p className="text-neutral-500 text-sm">Reward shareholders for match wins.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* TEAM SELECTOR */}
        <div>
          <label className="text-xs font-mono text-neutral-500 uppercase font-bold block mb-2">
            Winning Team
          </label>
          <div className="relative">
            <select
              className="w-full bg-black border border-neutral-700 text-white p-4 rounded-lg appearance-none outline-none focus:border-emerald-500 transition-colors"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              {teams.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} — ₵{t.rating}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
              ▼
            </div>
          </div>
        </div>

        {/* MULTIPLIER SELECTOR */}
        <div>
          <label className="text-xs font-mono text-neutral-500 uppercase font-bold block mb-2">
            Match Tier (Multiplier)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Regular', val: '1.0', desc: '1%' },
              { label: 'Major', val: '3.0', desc: '3%' },
              { label: 'Grand Finals', val: '5.0', desc: '5%' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setMultiplier(opt.val)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  multiplier === opt.val
                    ? 'bg-emerald-900/30 border-emerald-500 ring-1 ring-emerald-500/50'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div className={`font-bold ${multiplier === opt.val ? 'text-emerald-400' : 'text-neutral-300'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-neutral-500">{opt.desc} Yield</div>
              </button>
            ))}
          </div>
        </div>

        {/* ACTION BUTTON */}
        <button
          onClick={handlePayout}
          disabled={loading || !selectedTeam}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
        >
          {loading ? 'Processing Payments...' : '💰 Distribute Payout'}
        </button>

        {/* LOG OUTPUT */}
        {log && (
          <div className={`p-4 rounded-lg text-sm font-mono whitespace-pre-line border ${
            log.startsWith('✅') 
              ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200' 
              : 'bg-red-950/30 border-red-900/50 text-red-200'
          }`}>
            {log}
          </div>
        )}
      </div>
    </div>
  );
}