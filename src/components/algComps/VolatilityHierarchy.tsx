// src/components/docs/VolatilityHierarchy.tsx
export default function VolatilityHierarchy() {
  return (
    <div className="not-prose my-10 space-y-4">
      <div className="group relative p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-white font-bold uppercase tracking-tighter">Major LAN Events</h4>
            <p className="text-[10px] text-amber-500/70 font-mono">HIGHEST GLOBAL IMPACT</p>
          </div>
          <span className="text-2xl font-mono font-black text-amber-500">K=60</span>
        </div>
      </div>
      
      <div className="group relative p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-white font-bold uppercase tracking-tighter">Calibration (0-6 Games)</h4>
            <p className="text-[10px] text-blue-400/70 font-mono">RAPID SKILL DISCOVERY</p>
          </div>
          <span className="text-2xl font-mono font-black text-blue-400">K=50 → 20</span>
        </div>
      </div>

      <div className="p-4 bg-neutral-900 border border-white/5 rounded-xl flex justify-between items-center opacity-50">
        <span className="text-neutral-500 font-bold uppercase tracking-tighter text-sm">Standard Regional Play</span>
        <span className="text-xl font-mono font-black text-neutral-600">K=15</span>
      </div>
    </div>
  );
}