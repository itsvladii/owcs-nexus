import React, { useState } from 'react';
// Import the React versions of Lucide icons
import { Activity, Zap, Scale, Globe } from 'lucide-react';

interface Props {
    regionalAverages: { name: string; avg: number }[];
}

const REGION_COLORS: Record<string, string> = {
    "Korea": "#6eff18",         // Red/CR style
    "North America": "#823bf2",  // Blue/USA style
    "EMEA": "#54c4c4",           // Purple/Euro style
    "Pacific": "#58cdff",        // Emerald
    "China": "#f7c525",          // Gold/Yellow
    "Japan": "#ec0201",          // Pink
};

// Fallback color if a region isn't in the list
const DEFAULT_COLOR = "#737373";

const SECTIONS = [
    {
        title: "The Engine",
        icon: Scale,
        color: "text-amber-500",
        desc: "A custom ELO system where points transfer from loser to winner based on tournament context and margin of victory."
    },
    {
        title: "Dynamic K-Factor",
        icon: Activity,
        color: "text-blue-500",
        desc: "Not all matches tell the same story. The K-Factor varies based on the context of the team playing, where they play and how they play."
    },
    {
        title: "Region Strength",
        icon: Globe,
        color: "text-emerald-500",
        desc: "Teams start with different regional baselines based on historical performance of their respective regions."
    },
    {
        title: "Inactivity Fallback",
        icon: Zap,
        color: "text-red-500",
        desc: "Rosters that change >3 players trigger a hard reset. Teams that have not played official OWCS matches for a while (>90 days) are removed from the leaderboard."
    }
];

export default function RankingsSidebar({ regionalAverages }: Props) {
    // Use a string literal type for safety
    const [activeTab, setActiveTab] = useState<'algorithm' | 'regions'>('algorithm');

    return (
        <aside className="w-full lg:w-80 shrink-0 space-y-8">
            <div className="sticky top-24 space-y-6">

                {/* TAB SWITCHER: Designed to match your existing HUD */}
                <div className="flex gap-2 p-1.5 bg-neutral-900/80 border border-white/5 rounded-xl backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab('algorithm')}
                        className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all rounded-lg ${activeTab === 'algorithm' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Algorithm
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('regions')}
                        className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all rounded-lg ${activeTab === 'regions' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Avg. Region Power
                    </button>
                </div>

                {/* CONTENT AREA: Maintains container height to prevent layout shifts */}
                <div className="min-h-[480px]">
                    {activeTab === 'algorithm' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h3 className="font-title font-bold text-2xl uppercase text-white mb-1">How It Works</h3>
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Algorithm v1.0 (2026)</p>
                            </div>

                            <div className="space-y-4">
                                {SECTIONS.map((s, i) => (
                                    <div key={i} className="group bg-neutral-900/50 border border-white/5 rounded-xl p-4 hover:bg-white/5 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 p-2 rounded bg-neutral-950 border border-white/5 ${s.color} group-hover:text-white transition-colors`}>
                                                <s.icon size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white uppercase mb-1.5">{s.title}</h4>
                                                <p className="text-xs text-neutral-400 leading-relaxed">{s.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <a href="/algorithm" className="block w-full py-3 text-center border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white hover:border-white hover:bg-white/5 transition-all">
                                Read Full ELO Documentation
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div>
                                <h3 className="font-title font-bold text-2xl uppercase text-white mb-1 text-emerald-500">Regional Average Power</h3>
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Real-Time Regional Strength</p>
                            </div>

                            <div className="space-y-5 px-1">
                                {regionalAverages.map((reg, idx) => {
                                    const regionColor = REGION_COLORS[reg.name] || "#737373";
                                    // Calculate width relative to the top-ranked region for better scaling
                                    const maxWidth = regionalAverages[0]?.avg || 1200;
                                    const barWidth = (reg.avg / maxWidth) * 100;

                                    return (
                                        <div key={reg.name} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                                        {idx + 1}. {reg.name}
                                                    </span>

                                                    {/* ⚡ TREND INDICATOR */}
                                                    {reg.trend !== 0 && (
                                                        <span className={`flex items-center text-[8px] font-mono font-bold ${reg.trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {reg.trend > 0 ? '▲' : '▼'} {Math.abs(reg.trend)}
                                                        </span>
                                                    )}
                                                </div>

                                                <span
                                                    className="text-sm font-mono font-black"
                                                    style={{ color: regionColor, textShadow: `0 0 10px ${regionColor}44` }}
                                                >
                                                    {reg.avg}
                                                </span>
                                            </div>

                                            <div className="w-full bg-neutral-900/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${(reg.avg / (regionalAverages[0]?.avg || 1200)) * 100}%`,
                                                        background: `linear-gradient(90deg, ${regionColor}88 0%, ${regionColor} 100%)`,
                                                        boxShadow: `0 0 12px ${regionColor}33`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[9px] font-mono text-neutral-600 uppercase leading-relaxed pt-4 border-t border-white/5 italic">
                                * Based on mean rating of top 5 active rosters per region.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </aside>
    );
}