import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';

interface Props {
  team: any;
  isOpen: boolean;
  onClose: () => void;
}

// 1. CONFIGURATION
const SEASON_START_DATE = '2025-01-24'; // <--- IGNORE DATA BEFORE THIS
const MAJOR_EVENTS = [
  { label: 'Dallas Major', date: '2024-06-02' },
  { label: 'EWC', date: '2024-07-28' },
  { label: 'Stockholm', date: '2024-11-24' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-xl z-50">
        <p className="text-neutral-400 text-xs mb-1">{data.cleanDate}</p>
        
        {data.isMajorEvent && (
            <div className="text-amber-500 font-bold text-xs uppercase mb-1 flex items-center gap-1">
                <span>📍</span> {data.majorLabel}
            </div>
        )}
        {data.isPeak && !data.isMajorEvent && (
            <div className="text-amber-500 font-bold text-xs uppercase mb-1">
                All-Time Peak
            </div>
        )}
        {data.isLow && !data.isMajorEvent && (
            <div className="text-red-500 font-bold text-xs uppercase mb-1">
                All-Time Low
            </div>
        )}

        <p className="text-white font-mono font-bold text-lg">
          {payload[0].value} <span className="text-xs text-neutral-500">ELO</span>
        </p>
      </div>
    );
  }
  return null;
};

// --- SMART DOT ---
const CustomDot = (props: any) => {
  const { cx, cy, payload, index, points } = props;
  
  // Edge detection to prevent text clipping
  const isNearRightEdge = index > (points?.length || 0) - 4; 
  const isNearLeftEdge = index < 4;

  let textAnchor = "middle";
  let xOffset = 0;

  if (isNearRightEdge) {
      textAnchor = "end"; 
      xOffset = -8;
  } else if (isNearLeftEdge) {
      textAnchor = "start"; 
      xOffset = 8;
  }

  // PEAK (Gold)
  if (payload.isPeak) {
    return (
      <g transform={`translate(${cx},${cy})`}>
        <circle r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />
        <text 
            x={xOffset} 
            y={isNearRightEdge || isNearLeftEdge ? 4 : -10}
            textAnchor={textAnchor}
            fill="#f59e0b" 
            fontSize={9} 
            fontWeight="bold"
            style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
        >
            PEAK
        </text>
      </g>
    );
  }

  // LOW (Red)
  if (payload.isLow) {
    return (
      <g transform={`translate(${cx},${cy})`}>
        <circle r={5} fill="#ef4444" stroke="white" strokeWidth={2} />
        <text 
            x={xOffset} 
            y={isNearRightEdge || isNearLeftEdge ? 4 : 18}
            textAnchor={textAnchor}
            fill="#ef4444" 
            fontSize={9} 
            fontWeight="bold"
            style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
        >
            LOW
        </text>
      </g>
    );
  }

  return null;
};

export default function RankingModal({ team, isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !team || !mounted) return null;

  const formatDate = (dateInput: string | number | Date) => {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  // --- 2. DATA FILTERING & PROCESSING ---
  const startTimestamp = new Date(SEASON_START_DATE).getTime();

  let rawData = (team.history || [])
    // A. FILTER: Remove any "seed data" before season start
    .filter((h: any) => new Date(h.date).getTime() >= startTimestamp)
    .map((h: any) => ({
        elo: Math.round(h.elo),
        rawDate: new Date(h.date).getTime(),
        cleanDate: formatDate(h.date),
        displayDate: formatDate(h.date),
        isMajorEvent: false
    }))
    .sort((a: any, b: any) => a.rawDate - b.rawDate);

  // Safety: If no data after filtering, just use whatever we have or return empty
  if (rawData.length === 0 && team.history?.length > 0) {
      // Fallback: Just take the last known point if everything was filtered out
      rawData = [
          {
              elo: Math.round(team.history[team.history.length - 1].elo),
              rawDate: new Date().getTime(),
              cleanDate: "Season Start",
              displayDate: "Season Start",
              isMajorEvent: false
          }
      ];
  }

  // --- 3. FIX DUPLICATES ---
  const dateCounts: Record<string, number> = {};
  rawData = rawData.map((d: any) => {
      const count = dateCounts[d.cleanDate] || 0;
      dateCounts[d.cleanDate] = count + 1;
      if (count > 0) {
          return { ...d, displayDate: d.cleanDate + ' '.repeat(count) };
      }
      return d;
  });

  // --- 4. INJECT MAJORS ---
  MAJOR_EVENTS.forEach(event => {
      const eventTime = new Date(event.date).getTime();
      const eventDisplayDate = formatDate(event.date);
      const minTime = rawData[0]?.rawDate;
      const maxTime = rawData[rawData.length - 1]?.rawDate;

      if (eventTime >= minTime && eventTime <= maxTime) {
          const existingIndex = rawData.findIndex((d: any) => d.cleanDate === eventDisplayDate);

          if (existingIndex !== -1) {
              rawData[existingIndex].isMajorEvent = true;
              rawData[existingIndex].majorLabel = event.label;
          } else {
              const insertIndex = rawData.findIndex((d: any) => d.rawDate > eventTime);
              if (insertIndex !== -1) {
                  const prev = rawData[insertIndex - 1];
                  const next = rawData[insertIndex];
                  
                  // Safe interpolation check
                  if (prev && next) {
                      const ratio = (eventTime - prev.rawDate) / (next.rawDate - prev.rawDate);
                      const interpolatedElo = Math.round(prev.elo + (next.elo - prev.elo) * ratio);
    
                      const ghostPoint = {
                          elo: interpolatedElo,
                          rawDate: eventTime,
                          cleanDate: eventDisplayDate,
                          displayDate: eventDisplayDate,
                          isMajorEvent: true,
                          majorLabel: event.label
                      };
                      rawData.splice(insertIndex, 0, ghostPoint);
                  }
              }
          }
      }
  });

  // --- 5. IDENTIFY PEAK & LOW ---
  const maxVal = Math.max(...rawData.map((d: any) => d.elo));
  const minVal = Math.min(...rawData.map((d: any) => d.elo));

  const chartData = rawData.map((d: any) => ({
      ...d,
      isPeak: d.elo === maxVal,
      isLow: d.elo === minVal
  }));

  const minElo = minVal - 20;
  const maxElo = maxVal + 20;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>

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

        <div className="p-8">
           <div className="mb-8">
             <div className="flex justify-between items-end mb-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Performance History</h3>
                <div className="flex gap-4">
                    <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Peak: {maxVal}
                    </span>
                    <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Low: {minVal}
                    </span>
                </div>
             </div>
             
             <div className="w-full h-72 bg-neutral-950/30 rounded-xl border border-neutral-800/50 p-2 pt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    // Margins to prevent text clip
                    margin={{ top: 20, right: 30, left: 30, bottom: 20 }} 
                  >
                    <defs>
                      <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    
                    <XAxis 
                        dataKey="displayDate" 
                        stroke="#525252" 
                        tick={{fontSize: 10}} 
                        tickMargin={10} 
                        axisLine={false} 
                        tickLine={false} 
                        interval="preserveStartEnd"
                        minTickGap={30} 
                    />
                    
                    <YAxis domain={[minElo, maxElo]} hide={true} />
                    
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    
                    {chartData.filter((d: any) => d.isMajorEvent).map((d: any, i: number) => (
                        <ReferenceLine 
                            key={i} 
                            x={d.displayDate} 
                            stroke="#525252" 
                            strokeOpacity={0.8}
                            strokeDasharray="3 3"
                        >
                            <Label 
                                value={d.majorLabel} 
                                position="insideTopLeft" 
                                angle={-90} 
                                offset={15}
                                fill="#737373"
                                fontSize={10}
                                fontWeight="bold"
                                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                            />
                        </ReferenceLine>
                    ))}

                    <Area 
                        type="monotone" 
                        dataKey="elo" 
                        stroke="#f59e0b" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorElo)" 
                        animationDuration={1500}
                        dot={<CustomDot />} 
                        activeDot={{ r: 6, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                    />
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
    document.body
  );
}