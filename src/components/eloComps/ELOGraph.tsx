import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface Props {
    team: any;
    isOpen: boolean;
    onClose: () => void;
    matches: any[];
}

function getSmartAbbreviation(name: string): string {
    if (!name) return "";
    return name
        .replace(/Overwatch Champions Series/g, 'OWCS')
        .replace(/North America/g, 'NA')
        .replace(/Europe, Middle East & North Africa/g, 'EMEA')
        .replace(/Korea/g, 'KR')
        .replace(/Stage/g, 'Stg')
        .replace(/ - /g, ' ')
        .trim();
}

export default function RankingModal({ team, isOpen, onClose, matches }: Props) {
    const [mounted, setMounted] = useState(false);
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const teamHistory = useMemo(() => {
        if (!team || !matches) return [];
        return matches
            .filter(m => m.team_a === team.name || m.team_b === team.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [team, matches]);

    const chartConfig = useMemo(() => {
        if (!team || !team.history) return null;

        const sortedHistory = [...team.history].sort((a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const dataPoints = sortedHistory.map((h: any) => ({
            x: new Date(h.date).getTime(),
            y: Math.round(h.elo)
        }));

        return {
            series: [{ name: "Rating", data: dataPoints }],
            options: {
                chart: {
                    type: 'area',
                    background: 'transparent',
                    toolbar: { show: false },
                    zoom: { enabled: false },
                },
                theme: { mode: 'dark' },
                stroke: { curve: 'smooth', width: 3, colors: ['#22c55e'] },
                markers: { size: 0 },
                dataLabels: { enabled: false },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.4,
                        opacityTo: 0,
                        stops: [0, 100],
                    }
                },
                grid: { show: true, borderColor: '#1f1f1f', strokeDashArray: 4 },
                xaxis: {
                    type: 'datetime',
                    axisBorder: { show: false },
                    labels: {
                        style: { colors: '#737373', fontSize: '10px' },
                        datetimeFormatter: { hour: 'dd MMM' }
                    }
                },
                yaxis: {
                    opposite: true,
                    labels: { style: { colors: '#737373' } }
                },
                tooltip: { theme: 'dark' }
            } as ApexOptions
        };
    }, [team]);

    if (!mounted || !isOpen || !team) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            {/* MODAL CONTAINER: Fixed height on mobile to prevent overflow issues */}
            <div className="relative w-full max-w-5xl bg-neutral-950 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[95vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* MODAL HEADER: Responsive Stacking */}
                <div className="px-5 py-5 sm:px-8 sm:py-6 border-b border-white/5 bg-neutral-900/40 flex justify-between items-start relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 relative z-10 w-full">
                        {team.logo && (
                            <img
                                src={team.logo}
                                alt={team.name}
                                width="80"
                                height="80"
                                loading="lazy"
                                className="w-12 h-12 sm:w-20 sm:h-20 object-contain"
                            />
                        )}
                        <div className="flex flex-col w-full">
                            <h2 className="text-2xl sm:text-5xl font-black font-title text-white uppercase tracking-tighter leading-none">{team.name}</h2>
                            <div className="flex gap-4 sm:gap-6 mt-3 sm:mt-4">
                                <div className="flex flex-col">
                                    <span className="text-neutral-500 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest">ELO Rating</span>
                                    <span className="text-lg sm:text-2xl font-mono font-black text-emerald-400 leading-none">{Math.round(team.rating)}</span>
                                </div>
                                <div className="flex flex-col border-l border-white/10 pl-4 sm:pl-6">
                                    <span className="text-neutral-500 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest">Seasonal Record</span>
                                    <span className="text-lg sm:text-2xl font-mono font-black text-white leading-none">{team.wins}W - {team.losses}L</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-950">
                    {/* Graph Section: Hidden or height-adjusted for very small screens */}
                    <div className="h-48 sm:h-72 w-full p-4 sm:p-6 bg-neutral-900/20 border-b border-white/5">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2 block">ELO Graph</span>
                        {chartConfig && (
                            <Chart options={chartConfig.options} series={chartConfig.series} type="area" height="100%" width="100%" />
                        )}
                    </div>

                    {/* Match Log Section */}
                    <div className="p-4 sm:p-8">
                        <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-[0.3em] mb-4 sm:mb-6 flex items-center gap-3">
                            <div className="w-1 h-4 bg-blue-500"></div>
                            Historical Match Log
                        </h3>

                        <div className="space-y-3">
                            {teamHistory.map((m) => {
                                const isTeamA = m.team_a === team.name;
                                const opponent = isTeamA ? m.team_b : m.team_a;
                                const myScore = isTeamA ? m.score_a : m.score_b;
                                const opScore = isTeamA ? m.score_b : m.score_a;
                                const change = Math.round(isTeamA ? m.elo_change_a : m.elo_change_b);
                                const isWin = change >= 0;
                                const isExpanded = expandedMatchId === m.id;

                                return (
                                    <div key={m.id} className="border border-white/5 bg-neutral-900/30 rounded-xl overflow-hidden hover:border-white/10 transition-all">
                                        <div
                                            onClick={() => m.details && setExpandedMatchId(isExpanded ? null : m.id)}
                                            className={`flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center p-4 ${m.details ? 'cursor-pointer' : ''}`}
                                        >
                                            {/* Mobile Top Row: Win/Loss and Stats */}
                                            <div className="flex w-full justify-between items-center sm:col-span-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${isWin ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                        {isWin ? 'W' : 'L'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] sm:text-xs font-mono text-neutral-400 truncate max-w-[120px] sm:max-w-none">{getSmartAbbreviation(m.tournament)}</span>
                                                        <span className="text-[9px] text-neutral-600 font-mono uppercase">{new Date(m.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className={`sm:hidden font-mono font-black text-sm ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {isWin ? '+' : ''}{change}
                                                </div>
                                            </div>

                                            {/* Opponent and Score */}
                                            <div className="flex justify-between sm:justify-start w-full sm:col-span-6 gap-8">
                                                <div className="text-white font-bold tracking-tight text-sm sm:text-base truncate">
                                                    <span className="text-neutral-600 font-normal mr-2 italic">VS</span> {opponent}
                                                </div>
                                                <div className="font-mono text-neutral-400 text-sm">
                                                    {myScore} <span className="text-neutral-700">-</span> {opScore}
                                                </div>
                                            </div>

                                            {/* Desktop-only Elo change */}
                                            <div className={`hidden sm:block sm:col-span-2 text-right font-mono font-black ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isWin ? '+' : ''}{change}
                                            </div>
                                        </div>

                                        {/* Expanded Details: Optimized for Mobile */}
                                        {isExpanded && m.details && (
                                            <div className="bg-black/60 border-t border-white/5 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2">
                                                {m.details.mvp && (
                                                    <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                                                        <span className="text-[8px] sm:text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded uppercase tracking-widest">Match MVP</span>
                                                        <span className="text-xs font-mono text-white font-bold italic">{m.details.mvp}</span>
                                                    </div>
                                                )}

                                                <div className="grid gap-2">
                                                    {m.details.maps.map((map: any, idx: number) => {
                                                        const isMapWin = (map.winner === '1' && isTeamA) || (map.winner === '2' && !isTeamA);
                                                        return (
                                                            <div key={idx} className="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-1 h-6 rounded-full ${isMapWin ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-bold font-mono text-white uppercase">{map.name}</span>
                                                                            <span className="text-[8px] text-neutral-600 font-mono uppercase tracking-widest">{map.mode}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`font-mono font-bold text-sm ${isMapWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {map.score}
                                                                    </span>
                                                                </div>

                                                                {/* Bans: Wrapped for mobile */}
                                                                {map.bans && map.bans.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-white/5">
                                                                        <span className="text-[8px] text-neutral-700 font-mono font-bold uppercase mr-1">Bans:</span>
                                                                        {map.bans.map((ban: string, bIdx: number) => (
                                                                            <span key={bIdx} className="text-[10px] font-mono text-red-400/60 bg-red-400/5 px-1 rounded">
                                                                                {ban}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}