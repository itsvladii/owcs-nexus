import { useState, useEffect, useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';

interface Props {
  history: { date: string; price: number }[];
}

export default function TeamLineChart({ history }: Props) {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  // 1. DATA PREP
  const { series, trendColor } = useMemo(() => {
    if (!history || history.length === 0) return { series: [], trendColor: '#10b981' };

    // Simply map the raw data: Date -> Price
    const data = history.map(entry => ({
        x: new Date(entry.date).getTime(), // Timestamp for easier X-axis handling
        y: entry.price
    }));

    // Determine Trend Color (Green/Red)
    const startPrice = data[0]?.y || 0;
    const endPrice = data[data.length - 1]?.y || 0;
    const isUp = endPrice >= startPrice;

    return {
        trendColor: isUp ? '#10b981' : '#f43f5e', // Emerald-500 or Rose-500
        series: [{ name: 'Price', data }]
    };
  }, [history]);

  // 2. CONFIGURATION
  const options: ApexOptions = {
  chart: {
    type: 'area', // 'area' looks better for price/networth
    toolbar: { show: false }, // Hide the hamburger menu
    zoom: { enabled: false }
  },
  // 1. THIS FIXES THE HOVER ISSUE
  tooltip: {
    enabled: true,
    shared: true,      // Shows data for all series at this X-point
    intersect: false,  // CRITICAL: Triggers tooltip even if you aren't touching the line
    followCursor: true, // Tooltip follows mouse for immediate feedback
    theme: 'dark',
    x: { show: true, format: 'dd MMM' }, // Clean date format
  },
  // 2. The Crosshair (Visual Guide)
  xaxis: {
    type: 'datetime',
    tooltip: { enabled: false }, // Hide the bottom axis label if it clutter
    crosshairs: {
      show: true,
      position: 'back',
      stroke: { 
        color: '#10b981', // Emerald green line
        width: 1, 
        dashArray: 3 
      },
    },
  },
  // 3. Visual Styling to reduce "noise"
  stroke: {
    curve: 'stepline', // 'stepline' represents price changes more accurately than 'smooth'
    width: 2,
    colors: ['#10b981']
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05, // Fades out at bottom
      stops: [0, 100]
    }
  },
  dataLabels: { enabled: false }, // Hide numbers on the line itself
  grid: {
    show: true,
    borderColor: '#333',
    strokeDashArray: 4, // Subtle grid
  }
};

  if (!Chart || history.length < 2) {
      return <div className="h-full flex items-center justify-center text-neutral-600 font-mono text-xs">Loading Chart...</div>;
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <Chart options={options} series={series} type="area" height="100%" />
    </div>
  );
}