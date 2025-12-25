import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';

interface InteractiveChartProps {
  history: { date: string; elo: number }[];
  height?: number;
}

export default function InteractiveChart({ history, height = 50 }: InteractiveChartProps) {
  // 1. Safety Check
  if (!history || history.length < 2) {
    return <div className="text-xs text-neutral-600 font-mono text-center pt-2">No Data</div>;
  }

  // 2. Process Data
  // We take the last 20 games for relevance
  const slicedData = history.slice(-20);
  
  const series = [{
    name: 'ELO',
    data: slicedData.map(h => h.elo) // Just the raw numbers
  }];

  // 3. Determine Color (Green if up, Red if down)
  const isUp = slicedData[slicedData.length - 1].elo >= slicedData[0].elo;
  const color = isUp ? '#10B981' : '#EF4444';

  // 4. Configuration (The Magic Sauce)
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      sparkline: { enabled: true }, // <--- THIS simplifies everything (hides axes, padding)
      animations: { enabled: false } // Disable animation for instant loading
    },
    stroke: {
      curve: 'monotoneCubic',
      width: 2,
      colors: [color]
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
        colorStops: [
            { offset: 0, color: color, opacity: 0.4 },
            { offset: 100, color: color, opacity: 0 }
        ]
      }
    },
    tooltip: {
      theme: 'dark', // Fits your aesthetic
      x: { show: false }, // Hide the messy index number
      y: {
        formatter: (val: number) => val.toFixed(0), // Clean numbers
        title: {
            formatter: () => 'ELO: ' // Label inside tooltip
        }
      },
      fixed: { enabled: false },
      marker: { show: false } // Cleaner look
    },
    colors: [color]
  };

  return (
    <div className="w-full h-full">
      <Chart 
        options={options} 
        series={series} 
        type="area" 
        height={height} 
        width="100%" 
      />
    </div>
  );
}