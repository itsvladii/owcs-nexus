import { useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function RaceControl() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFinishRace = async () => {
    // 1. Safety Confirm
    if (!window.confirm("⚠️ CONFIRM RACE FINISH?\n\nThis will freeze the leaderboard and award Season Points to the Top 10 traders.\n\nThis action cannot be undone.")) {
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 2. Call the DB function we created earlier
      const { data, error } = await supabase.rpc('finish_weekly_race');
      
      if (error) throw error;
      setStatus('✅ Success! Points distributed.');
      
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-red-500/30 p-8 rounded-2xl shadow-xl max-w-lg">
      <div className="flex items-center gap-3 mb-4 text-red-500">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span className="font-bold uppercase tracking-widest text-sm">Danger Zone</span>
      </div>

      <h3 className="text-2xl font-bold text-white mb-4">
        🏁 Finish Weekly Race
      </h3>
      
      <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
        This calculates the <strong>Top 10</strong> traders by current Net Worth and permanently adds Championship Points to their profiles (25, 18, 15...).
      </p>

      <button
        onClick={handleFinishRace}
        disabled={loading}
        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-pulse">Calculating...</span>
        ) : (
          <>
            <span>🚩</span> Flag Race Finish
          </>
        )}
      </button>

      {status && (
        <div className={`mt-6 p-4 rounded-xl border text-sm font-mono ${status.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}>
          {status}
        </div>
      )}
    </div>
  );
}