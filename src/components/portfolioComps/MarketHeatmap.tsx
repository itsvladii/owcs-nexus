import { useState, useEffect, useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';

// Define strict color palette for Tiers
const TIER_COLORS: Record<string, string> = {
  'AAA': '#10b981', // Emerald (Prime)
  'AA':  '#22d3ee', // Cyan (High Grade)
  'A':   '#3b82f6', // Blue (Upper Med)
  'BBB': '#facc15', // Yellow (Lower Med)
  'CCC': '#f43f5e', // Rose (Speculative)
};

interface Team {
  id: string; 
  name: string;
  rating: number; 
  tier?: string; 
  region?: string;
  trend?: 'up' | 'down' | 'neutral'; 
}

interface Props {
  teams: Team[];
  onTeamClick: (team: Team) => void;
}

export default function MarketHeatmap({ teams, onTeamClick }: Props) {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => setChart(() => mod.default));
  }, []);

  // 1. DATA PROCESSING (UPDATED MATH)
  const series = useMemo(() => {
    if (!teams || teams.length === 0) return [];

    // Map data
    const data = teams.map(t => {
      // --- NEW LOGIC: EXPONENTIAL SCALING ---
      // 1. Get the surplus value above $90 (The floor)
      const surplus = Math.max(t.rating - 90, 1);
      
      // 2. Raise it to the power of 2.5
      // This exaggerates differences significantly.
      // - $160 (Surplus 70) -> 70^2.5 = ~41,000 area
      // - $140 (Surplus 50) -> 50^2.5 = ~17,600 area (AAA is >2x bigger than AA)
      // - $110 (Surplus 20) -> 20^2.5 = ~1,700 area (AAA is >20x bigger than CCC)
      const exaggeratedSize = Math.pow(surplus, 2.5);

      // Color logic remains the same
      const color = t.tier && TIER_COLORS[t.tier] ? TIER_COLORS[t.tier] : '#525252';

      return {
        x: t.name,
        y: exaggeratedSize, 
        fillColor: color,
        // Store real price for the label
        meta: { realPrice: t.rating, tier: t.tier } 
      };
    });

    return [{ data }];
  }, [teams]);

  const options: ApexOptions = {
    chart: {
      type: 'treemap',
      height: '100%',
      background: 'transparent',
      toolbar: { show: false },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const teamIndex = config.dataPointIndex;
          const selectedTeam = teams[teamIndex];
          if (selectedTeam) onTeamClick(selectedTeam);
        }
      },
      animations: { enabled: true, speed: 800 }
    },
    theme: { mode: 'dark' },
    title: {
      text: 'MARKET CAP MAP (TIER COLORED)',
      align: 'center',
      style: { color: '#525252', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px' }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        colors: ['#000000'] 
      },
      formatter: function(text: string, op: any) {
        const realPrice = op.w.config.series[op.seriesIndex].data[op.dataPointIndex].meta.realPrice;
        return [text, `₵${realPrice.toFixed(2)}`];
      },
      offsetY: -4
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
      }
    },
    stroke: { width: 2, colors: ['#171717'] },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val, opts) => {
           const realPrice = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].meta.realPrice;
           const tier = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].meta.tier;
           return `₵${realPrice.toFixed(2)} (${tier})`;
        }
      }
    }
  };

  if (!Chart) return <div className="h-96 flex items-center justify-center text-xs font-mono text-neutral-600">Loading Heatmap...</div>;

  return (
    <div className="w-full h-[600px] md:h-[800px] bg-neutral-900/30 border border-white/5 rounded-xl p-4 animate-in fade-in">
      <Chart options={options} series={series} type="treemap" height="100%" />
    </div>
  );
}
