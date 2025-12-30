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
      type: 'area', // 'area' adds the nice gradient under the line
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true }
    },
    theme: { mode: 'dark' },
    stroke: {
      curve: 'smooth', // Makes the line wavy/smooth
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4, // Fade from 40% opacity
        opacityTo: 0.0,   // To 0% opacity (transparent)
        stops: [0, 100]
      }
    },
    colors: [trendColor],
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime', // Automatically handles dates nicely
      tooltip: { enabled: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { 
          style: { colors: '#525252', fontSize: '10px', fontFamily: 'monospace' },
          datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM' }
      }
    },
    yaxis: {
      labels: { 
          style: { colors: '#737373', fontFamily: 'monospace' },
          formatter: (value) => `$${value.toFixed(0)}`
      }
    },
    grid: {
      borderColor: '#ffffff05',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' }, // e.g. "12 Dec 2024"
      y: { 
          formatter: (val) => `$${val.toFixed(2)}`
      }
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