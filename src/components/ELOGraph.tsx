import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 1. Import createPortal
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Props {
  team: any;
  isOpen: boolean;
  onClose: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-xl">
        <p className="text-neutral-400 text-xs mb-1">{label}</p>
        <p className="text-amber-500 font-mono font-bold text-lg">
          {payload[0].value} <span className="text-xs text-neutral-500">ELO</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function RankingModal({ team, isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  // 2. Handle Mounting & Scroll Locking
  useEffect(() => {
    setMounted(true);
    
    if (isOpen) {
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden'; 
    }
    
    return () => {
      // Re-enable scrolling when closed/unmounted
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Don't render anything on the server (SSR) or if closed
  if (!isOpen || !team || !mounted) return null;

  const data = (team.history || []).map((h: any) => ({
    elo: Math.round(h.elo),
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const minElo = Math.min(...data.map((d: any) => d.elo)) - 20;
  const maxElo = Math.max(...data.map((d: any) => d.elo)) + 20;

  // 3. THE PORTAL: Moves this div to document.body
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 font-sans">
      
      {/* Backdrop (Now covers the WHOLE screen) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Window */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
          <div className="flex items-center gap-4">
             {team.logo && <img src={team.logo} className="w-12 h-12 object-contain" />}
             <div>
               <h2 className="text-3xl font-title text-white leading-none">{team.name}</h2>
               <p className="text-sm text-neutral-500 font-bold uppercase tracking-wider">{team.region}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
           
           {/* Chart */}
           <div className="mb-8">
             <div className="flex justify-between items-end mb-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Season Performance</h3>
                <span className="text-xs text-neutral-600 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">Last 30 Days</span>
             </div>
             <div className="w-full h-64 bg-neutral-950/30 rounded-xl border border-neutral-800/50 p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" tick={{fontSize: 10}} tickMargin={10} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[minElo, maxElo]} hide={true} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#525252', strokeWidth: 1, strokeDasharray: '5 5' }} />
                    <Area type="monotone" dataKey="elo" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorElo)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
           </div>

           {/* Stats Grid */}
           <div className="grid grid-cols-3 gap-4">
             <div className="bg-neutral-800/20 p-4 rounded-xl text-center border border-neutral-800">
               <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Current ELO</p>
               <p className="text-3xl font-mono font-bold text-white">{Math.round(team.rating)}</p>
             </div>
             <div className="bg-neutral-800/20 p-4 rounded-xl text-center border border-neutral-800">
               <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Win Rate</p>
               <p className="text-3xl font-mono font-bold text-green-500">
                 {Math.round((team.wins / (team.wins + team.losses)) * 100)}%
               </p>
             </div>
             <div className="bg-neutral-800/20 p-4 rounded-xl text-center border border-neutral-800">
               <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Matches</p>
               <p className="text-3xl font-mono font-bold text-white">{team.wins + team.losses}</p>
             </div>
           </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-center">
           {team.slug && (
             <a href={`/teams/${team.slug}/`} className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-bold text-sm transition-colors">
               View Full Team Profile 
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
             </a>
           )}
        </div>

      </div>
    </div>,
    document.body // <-- Render directly into the body
  );
}