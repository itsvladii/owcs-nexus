// src/components/docs/CalibrationGraph.tsx
import React, { useEffect, useState, useMemo } from 'react';

export default function CalibrationGraph() {
    // 1. Create a state to hold the Chart component
    const [Chart, setChart] = useState<any>(null);

    // 2. Only import the library once the component is mounted (client-side)
    useEffect(() => {
        import('react-apexcharts').then((mod) => {
            setChart(() => mod.default);
        });
    }, []);


const chartConfig = useMemo(() => {
    const data = [50, 45, 40, 35, 30, 25, 20];
    return {
        series: [{ name: "K-Factor", data: data }],
        options: {
            chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
            theme: { mode: 'dark' },
            stroke: { curve: 'straight', width: 3, colors: ['#3b82f6'] },
            markers: { size: 5, colors: ['#3b82f6'], strokeWidth: 0 },
            grid: { borderColor: '#1f1f1f', strokeDashArray: 4 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0,
                    colorStops: [
                        { offset: 0, color: '#3b82f6', opacity: 0.4 },
                        { offset: 100, color: '#3b82f6', opacity: 0 }
                    ]
                }
            },
            // ⚡ UPDATED X-AXIS WITH LABEL
            xaxis: {
                categories: ['0', '1', '2', '3', '4', '5', '6+'],
                title: { 
                    text: 'MATCHES PLAYED (n)', 
                    style: { color: '#737373', fontSize: '10px', fontFamily: 'monospace', fontWeight: 600 } 
                },
                labels: { style: { colors: '#737373', fontSize: '9px' } },
                axisBorder: { show: false }
            },
            // ⚡ UPDATED Y-AXIS WITH LABEL
            yaxis: { 
                min: 0, 
                max: 60, 
                tickAmount: 3, 
                title: { 
                    text: 'K-FACTOR', 
                    style: { color: '#737373', fontSize: '10px', fontFamily: 'monospace', fontWeight: 600 } 
                },
                labels: { style: { colors: '#737373', fontSize: '9px' } } 
            },
            tooltip: { theme: 'dark' }
        }
    };
}, []);

    // 4. Return a placeholder/skeleton while loading to prevent layout shift
    if (!Chart) return (
        <div className="my-12 h-72 w-full bg-neutral-900/50 border border-white/5 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-neutral-700 font-mono text-xs uppercase tracking-widest">Initializing Chart HUD...</span>
        </div>
    );

    return (
        <div className="not-prose my-12 p-6 bg-neutral-900/50 border border-blue-500/10 rounded-2xl">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h4 className="text-white font-black uppercase tracking-tighter text-lg">Calibration Decay</h4>
                    <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Placement Phase Dynamics</p>
                </div>
            </div>
            <div className="h-64 w-full">
                <Chart options={chartConfig.options} series={chartConfig.series} type="area" height="100%" />
            </div>
        </div>
    );
}