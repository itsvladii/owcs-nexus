// src/components/docs/EligibilityHUD.tsx
import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function EligibilityHUD() {
  const eligible = [
    { name: "Regional Stages", detail: "Round Robin, Playoffs, Seeding Deciders ect." },
    { name: "Major LAN Events", detail: "Playoffs & Group Stages" },
    { name: "Regional Qualifiers", detail: "Promotion/Relegation, Stage 1 Open Qualifiers ect." },
    { name: "Major Qualifiers", detail: "Last Chanche Qualifiers, extra-regional qualification tournaments (i.e OWCS Asia Stage 1 Championship)" }
  ];

  const excluded = [
    { name: "Overwatch Collegiate"},
    { name: "Overwatch Calling All Heroes"},
    { name: "Overwatch World Cup"},
    { name: "FACEIT League", detail: "Masters, Expert, Open divisions" },
    { name: "Miscellaneous events", detail: "Pre-Season Bootcamp, Showmatches ect." }
  ];

  return (
    <div className="not-prose my-12 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ELIGIBLE PANEL */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
          <ShieldCheck size={80} />
        </div>
        <h4 className="text-emerald-400 font-mono text-[15px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <CheckCircle2 size={14} /> Eligible Matches
        </h4>
        <ul className="space-y-4">
          {eligible.map((item) => (
            <li key={item.name} className="border-l border-emerald-500/30 pl-4">
              <span className="block text-sm font-bold text-white uppercase tracking-tighter">{item.name}</span>
              <span className="block text-[10px] text-emerald-500/70 font-mono">{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* EXCLUDED PANEL */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
          <ShieldAlert size={80} />
        </div>
        <h4 className="text-red-400 font-mono text-[15px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <XCircle size={14} /> Ineligible Matches
        </h4>
        <ul className="space-y-4">
          {excluded.map((item) => (
            <li key={item.name} className="border-l border-red-500/30 pl-4 opacity-60">
              <span className="block text-sm font-bold text-neutral-300 uppercase tracking-tighter">{item.name}</span>
              <span className="block text-[10px] text-red-500/70 font-mono">{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}