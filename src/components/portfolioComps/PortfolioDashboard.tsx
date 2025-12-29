import { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import BuyStockModal from './BuyStockModal';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Interfaces ---
interface TeamData {
  name: string;
  region: string;
  rating: number; 
  logo: string | null;
}

interface PortfolioItem {
  team: string;
  region: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  logo: string | null;
}

interface TraderTag {
  label: string;
  icon: string;
  color: string;
  desc: string;
}

interface TransactionData {
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  created_at: string;
  price: number;     // Total Value of tx
  team_name: string;
  quantity?: number;
}

// --- TAG GENERATOR ---
function getTraderTags(assets: PortfolioItem[], netWorth: number, transactions: TransactionData[]): TraderTag[] {
  const tags: TraderTag[] = [];
  const sellCount = transactions.filter(t => t.type === 'SELL').length;
  const buyCount = transactions.filter(t => t.type === 'BUY').length;
  const totalCount = sellCount + buyCount;

  // 1. BEHAVIOR
  if (buyCount > 0 && sellCount === 0) {
    tags.push({ label: 'Diamond Hands', icon: '💎', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', desc: 'Refuses to sell. Holding to the moon.' });
  } else if (totalCount > 10 && sellCount > buyCount) {
    tags.push({ label: 'Paper Hands', icon: '🥬', color: 'bg-lime-500/10 text-lime-400 border-lime-500/20', desc: 'Panic seller. Sells more than buys.' });
  } else if (totalCount >= 20) {
    tags.push({ label: 'Day Trader', icon: '⚡', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', desc: 'High trading volume (>20 trades).' });
  }

  // 2. REGION
  const regionValue: Record<string, number> = {};
  assets.forEach(a => { regionValue[a.region] = (regionValue[a.region] || 0) + a.totalValue; });
  const dominant = Object.keys(regionValue).reduce((a, b) => regionValue[a] > regionValue[b] ? a : b, '');
  if (dominant && netWorth > 0) {
    const pct = regionValue[dominant] / netWorth;
    if (pct > 0.6) {
       if (dominant === 'Korea') tags.push({ label: 'K-Fanboy', icon: '🇰🇷', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', desc: '>60% invested in KR Teams' });
       if (dominant === 'North America') tags.push({ label: 'Hopium Addict', icon: '🇺🇸', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', desc: '>60% invested in NA Teams' });
       if (dominant === 'EMEA') tags.push({ label: 'EU Defender', icon: '🇪🇺', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', desc: '>60% invested in EMEA Teams' });
       if (dominant === 'China') tags.push({ label: 'CN Superfan', icon: '🇨🇳', color: 'bg-red-500/10 text-red-400 border-red-500/20', desc: '>60% invested in CN Teams' });
    }
  }

  // 3. WEALTH
  if (netWorth > 10000) tags.push({ label: 'Whale', icon: '🐋', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', desc: 'Net Worth > $10k' });
  else if (netWorth > 0 && netWorth < 100) tags.push({ label: 'Broke', icon: '💸', color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20', desc: 'Net Worth < $100' });

  // 4. STRATEGY
  if (assets.length === 1 && netWorth > 500) tags.push({ label: 'YOLO', icon: '🎰', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', desc: '100% Portfolio in 1 Asset' });
  if (assets.length >= 8) tags.push({ label: 'Index Fund', icon: '📊', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', desc: 'Holding 8+ unique teams' });

  // Fallback
  if (tags.length === 0 && netWorth > 0) tags.push({ label: 'Casual', icon: '☕', color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20', desc: 'Just vibing' });

  return tags;
}

export default function PortfolioDashboard() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<PortfolioItem[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [traderTags, setTraderTags] = useState<TraderTag[]>([]);
  
  // Dividends & Stats
  const [totalDividends, setTotalDividends] = useState(0);
  const [recentPayouts, setRecentPayouts] = useState<TransactionData[]>([]);
  const [topPayer, setTopPayer] = useState<{name: string, amount: number} | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 1. Basic Data
      const { data: portfolioRaw } = await supabase.from('portfolio').select('team_name, quantity').eq('user_id', user.id);
      const { data: teamsRaw } = await supabase.from('teams').select('name, region, rating, logo_dark');

      // 2. Fetch ALL Transactions (for tags + dividend history)
      const { data: txRaw } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (portfolioRaw && teamsRaw && txRaw) {
        // A. Process Portfolio
        calculateFinancials(portfolioRaw, teamsRaw, txRaw);
        
        // B. Process Dividends
        const dividendTxs = txRaw.filter(t => t.type === 'DIVIDEND');
        
        // B1. Total Lifetime
        const totalDivs = dividendTxs.reduce((sum, t) => sum + (t.price || 0), 0);
        setTotalDividends(totalDivs);

        // B2. Recent Payouts (Top 5)
        setRecentPayouts(dividendTxs.slice(0, 5));

        // B3. Find "Cash Cow" (Team that paid most)
        const payerMap: Record<string, number> = {};
        dividendTxs.forEach(t => {
            payerMap[t.team_name] = (payerMap[t.team_name] || 0) + t.price;
        });
        const bestPayerName = Object.keys(payerMap).reduce((a, b) => payerMap[a] > payerMap[b] ? a : b, '');
        if (bestPayerName) {
            setTopPayer({ name: bestPayerName, amount: payerMap[bestPayerName] });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = (portfolio: any[], teams: TeamData[], transactions: TransactionData[]) => {
    const teamMap = new Map(teams.map(t => [t.name, t]));
    const calculatedAssets: PortfolioItem[] = [];
    const regionMap = new Map<string, number>();
    let totalValue = 0;

    portfolio.forEach(item => {
      const team = teamMap.get(item.team_name);
      if (!team) return; 

      const value = item.quantity * team.rating;
      totalValue += value;

      calculatedAssets.push({
        team: item.team_name,
        region: team.region || 'GLOBAL',
        quantity: item.quantity,
        currentPrice: team.rating,
        totalValue: value,
        logo: team.logo_dark
      });

      const region = team.region || 'GLOBAL';
      const currentRegionVal = regionMap.get(region) || 0;
      regionMap.set(region, currentRegionVal + value);
    });

    const chartData = Array.from(regionMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    calculatedAssets.sort((a, b) => b.totalValue - a.totalValue);

    setAssets(calculatedAssets);
    setRegionData(chartData);
    setNetWorth(totalValue);
    setTraderTags(getTraderTags(calculatedAssets, totalValue, transactions));
  };

  // Chart Config
  const chartData = {
    labels: regionData.map(r => r.name),
    datasets: [{ data: regionData.map(r => r.value), backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'], borderWidth: 0 }],
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  if (loading) return <div className="p-10 text-center text-neutral-500 animate-pulse">Loading Portfolio...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 1. HEADER CARD */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-xl relative">
        {/* Decorative BG (Overflow Hidden ONLY here to prevent tooltip clipping) */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
             <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12" />
        </div>
        
        <div className="relative z-10 mb-6 md:mb-0">
          <h2 className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Total Net Worth</h2>
          <div className="text-5xl md:text-6xl font-black text-white tracking-tight">
            ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          {/* TRADER TAGS + TOOLTIPS */}
          <div className="flex flex-wrap gap-2 mt-4">
            {traderTags.map((tag, i) => (
               <div key={i} className={`relative group cursor-help flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider shadow-sm transition-transform hover:scale-105 ${tag.color}`}>
                  <span className="text-base">{tag.icon}</span> {tag.label}
                  
                  {/* THE TOOLTIP */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 border border-white/10 text-white text-[10px] normal-case font-medium rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 transform translate-y-1 group-hover:translate-y-0">
                    {tag.desc}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 border-b border-r border-white/10 rotate-45"></div>
                  </div>
               </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
            {/* STAT: Total Dividends */}
            <div className="bg-neutral-950/80 backdrop-blur-sm p-4 rounded-xl border border-neutral-800 text-center min-w-[130px]">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Lifetime Divs</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                ${totalDividends.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-neutral-600">Passive Income</div>
            </div>

            {/* STAT: Cash Cow (Top Payer) */}
            <div className="bg-neutral-950/80 backdrop-blur-sm p-4 rounded-xl border border-neutral-800 text-center min-w-[130px] hidden sm:block">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Cash Cow</div>
                {topPayer ? (
                    <>
                        <div className="text-xl font-bold text-white truncate max-w-[120px] mt-1">{topPayer.name}</div>
                        <div className="text-[10px] text-emerald-500 font-mono">+${topPayer.amount.toFixed(2)} Paid</div>
                    </>
                ) : (
                    <div className="text-xl font-bold text-neutral-700 mt-1">-</div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. LEFT COLUMN: Pie Chart + Recent Income Feed */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* PIE CHART */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl h-[280px] flex flex-col">
                <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">📊 Allocation</h3>
                <div className="flex-1 relative">
                    {regionData.length > 0 ? <Doughnut data={chartData} options={chartOptions} /> : <div className="text-neutral-500 text-xs text-center mt-10">No Data</div>}
                </div>
            </div>

            {/* RECENT INCOME FEED */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wide flex items-center justify-between">
                    <span>💸 Recent Income</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Live</span>
                </h3>
                <div className="space-y-3">
                    {recentPayouts.length === 0 ? (
                        <div className="text-neutral-600 text-xs italic text-center py-4">No dividends received yet.</div>
                    ) : (
                        recentPayouts.map((tx, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                                        {tx.team_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-white text-sm font-bold">{tx.team_name}</div>
                                        <div className="text-[10px] text-neutral-500">{new Date(tx.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-emerald-400 font-mono font-bold text-sm">
                                    +${tx.price.toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>

        {/* 3. RIGHT COLUMN: Assets Table */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl lg:col-span-2 h-fit">
          <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wide">🏛️ Your Positions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                  <th className="pb-4 pl-2">Asset</th>
                  <th className="pb-4 text-right">Qty</th>
                  <th className="pb-4 text-right">Price</th>
                  <th className="pb-4 text-right">Value</th>
                  <th className="pb-4 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {assets.map((asset) => (
                  <tr key={asset.team} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 pl-2 font-medium text-white flex items-center gap-3">
                      {asset.logo ? <img src={asset.logo} className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-neutral-800 rounded"></div>}
                      {asset.team}
                    </td>
                    <td className="py-4 text-right text-neutral-400 font-mono">{asset.quantity.toFixed(2)}</td>
                    <td className="py-4 text-right text-neutral-400 font-mono">${asset.currentPrice.toFixed(2)}</td>
                    <td className="py-4 text-right text-emerald-400 font-mono font-bold">${asset.totalValue.toLocaleString()}</td>
                    <td className="py-4 text-right pr-2">
                        <button onClick={() => setSelectedAsset(asset)} className="bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all">Trade</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAsset && (
        <BuyStockModal
          team={{ name: selectedAsset.team, rating: selectedAsset.currentPrice, logo: selectedAsset.logo }}
          onClose={() => setSelectedAsset(null)}
          onSuccess={() => { fetchPortfolioData(); setSelectedAsset(null); }}
        />
      )}
    </div>
  );
}