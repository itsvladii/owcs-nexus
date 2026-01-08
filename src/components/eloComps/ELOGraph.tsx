import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface Props {
  team: any;
  isOpen: boolean;
  onClose: () => void;
}

// 1. CONFIGURATION
const SEASON_START_DATE = '2025-01-24'; 
const MAJOR_EVENTS = [
  { label: 'Dallas Major', date: '2024-06-02' },
  { label: 'EWC', date: '2024-07-28' },
  { label: 'Stockholm', date: '2024-11-24' },
];

export default function RankingModal({ team, isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const chartConfig = useMemo(() => {
    if (!team || !team.history) return null;

    // --- A. PROCESS DATA ---
    const startTimestamp = new Date(SEASON_START_DATE).getTime();
    
    // Filter & Sort
    let rawData = team.history
        .filter((h: any) => new Date(h.date).getTime() >= startTimestamp)
        .map((h: any) => ({
            x: new Date(h.date).getTime(),
            y: Math.round(h.elo),
            dateStr: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }))
        .sort((a: any, b: any) => a.x - b.x);

    // Fallback if empty
    if (rawData.length === 0 && team.history.length > 0) {
        const last = team.history[team.history.length - 1];
        rawData = [{
            x: new Date().getTime(),
            y: Math.round(last.elo),
            dateStr: "Season Start"
        }];
    }

    // --- B. CALCULATE STATS ---
    const values = rawData.map((d: any) => d.y);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    // --- C. GENERATE ANNOTATIONS (Majors + Peak/Low) ---
    const annotations: any = {
        xaxis: [],
        points: []
    };

    // 1. Major Events (Vertical Lines)
    MAJOR_EVENTS.forEach(event => {
        const eventTime = new Date(event.date).getTime();
        if (eventTime >= rawData[0].x && eventTime <= rawData[rawData.length - 1].x) {
            annotations.xaxis.push({
                x: eventTime,
                borderColor: '#525252',
                strokeDashArray: 4,
                label: {
                    text: event.label,
                    orientation: 'horizontal',
                    style: {
                        color: '#a3a3a3',
                        background: '#171717',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: { left: 4, right: 4, top: 2, bottom: 2 }
                    },
                    offsetY: -10 // Push label up slightly
                }
            });
        }
    });

    // 2. Peak & Low (Point Markers)
    rawData.forEach((point: any) => {
        if (point.y === maxVal) {
            annotations.points.push({
                x: point.x,
                y: point.y,
                marker: { size: 4, fillColor: '#f59e0b', strokeColor: '#fff', strokeWidth: 2 },
                label: {
                    text: 'PEAK',
                    style: { color: '#fff', background: '#f59e0b', fontSize: '10px', fontWeight: 'bold' },
                    offsetY: -6
                }
            });
        } else if (point.y === minVal) {
            annotations.points.push({
                x: point.x,
                y: point.y,
                marker: { size: 4, fillColor: '#ef4444', strokeColor: '#fff', strokeWidth: 2 },
                label: {
                    text: 'LOW',
                    style: { color: '#fff', background: '#ef4444', fontSize: '10px', fontWeight: 'bold' },
                    offsetY: 6
                }
            });
        }
    });

    // --- D. APEX OPTIONS ---
    const options: ApexOptions = {
        chart: {
            type: 'area',
            background: 'transparent',
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit'
        },
        theme: { mode: 'dark' },
        stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#f59e0b'] // Amber-500
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 100],
                colorStops: [
                    { offset: 0, color: '#f59e0b', opacity: 0.4 },
                    { offset: 100, color: '#f59e0b', opacity: 0 }
                ]
            }
        },
        dataLabels: { enabled: false },
        grid: {
            borderColor: '#262626',
            strokeDashArray: 3,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 0, right: 10, bottom: 0, left: 10 }
        },
        xaxis: {
            type: 'datetime',
            tooltip: { enabled: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#737373', fontSize: '10px' },
                format: 'dd MMM'
            },
            crosshairs: { show: false } // Cleaner look
        },
        yaxis: {
            show: false, // Hide Y-axis numbers to match your previous design
            min: minVal - 20,
            max: maxVal + 20
        },
        annotations: annotations,
        tooltip: {
            theme: 'dark',
            x: { format: 'dd MMM yyyy' },
            y: {
                formatter: (val) => `${val} ELO`,
                title: { formatter: () => '' } // Hide series name
            },
            marker: { show: false },
            fixed: {
                enabled: false,
                position: 'topRight'
            }
        }
    };

    const series = [{ name: 'ELO', data: rawData }];

    return { options, series, maxVal, minVal };
  }, [team]);

  if (!isOpen || !team || !mounted || !chartConfig) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
          <div className="flex items-center gap-4">
             {team.logo && <img src={team.logo} className="w-12 h-12 object-contain" alt={team.name} />}
             <div>
               <h2 className="text-3xl font-title text-white leading-none tracking-wide">{team.name}</h2>
               <p className="text-sm text-neutral-500 font-bold uppercase tracking-wider">{team.region}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
           
           {/* Chart Header Stats */}
           <div className="flex justify-between items-end mb-6">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Performance History</h3>
                <div className="flex gap-4">
                    <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Peak: {chartConfig.maxVal}
                    </span>
                    <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Low: {chartConfig.minVal}
                    </span>
                </div>
           </div>
             
           {/* The Chart Container */}
           <div className="w-full h-80 bg-neutral-950/30 rounded-xl border border-neutral-800/50 p-2 relative">
                <Chart 
                    options={chartConfig.options} 
                    series={chartConfig.series} 
                    type="area" 
                    height="100%" 
                    width="100%"
                />
           </div>

           {/* Bottom Stats Grid */}
           <div className="grid grid-cols-3 gap-4 mt-8">
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

        

      </div>
    </div>,
    document.body
  );
}