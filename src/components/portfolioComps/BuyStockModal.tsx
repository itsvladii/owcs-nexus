import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ScriptableContext } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

interface TradeModalProps {
  team: {
    name: string;
    rating: number; 
    logo: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function BuyStockModal({ team, onClose, onSuccess }: TradeModalProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [inputType, setInputType] = useState<'usd' | 'shares'>('usd');
  const [inputValue, setInputValue] = useState<string>(''); 
  
  const [cash, setCash] = useState(0);
  const [ownedShares, setOwnedShares] = useState(0);
  const [historyData, setHistoryData] = useState<{date: string, price: number}[]>([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const balancePromise = supabase.from('profiles').select('cash').eq('id', user.id).single();
      const portfolioPromise = supabase.from('portfolio').select('quantity').eq('user_id', user.id).eq('team_name', team.name).single();
      
      const historyPromise = supabase
        .from('matches')
        .select('date, team_a, team_b, team_a_elo_after, team_b_elo_after')
        .or(`team_a.eq.${team.name},team_b.eq.${team.name}`)
        .order('date', { ascending: false })
        .limit(30); 

      const [balanceRes, portfolioRes, historyRes] = await Promise.all([balancePromise, portfolioPromise, historyPromise]);

      if (balanceRes.data) setCash(balanceRes.data.cash);
      if (portfolioRes.data) setOwnedShares(portfolioRes.data.quantity);
      
      if (historyRes.data) {
        const points = historyRes.data.map(match => {
          const price = match.team_a === team.name ? match.team_a_elo_after : match.team_b_elo_after;
          return { date: match.date, price: price };
        }).reverse(); 
        setHistoryData(points);
      }
    }
    loadData();
  }, [team.name]);

  // --- CHART PREP ---
  const chartData = useMemo(() => {
    let labels: string[] = [];
    let prices: number[] = [];

    if (historyData.length === 0) {
        labels = ['Now'];
        prices = [team.rating];
    } else {
        labels = historyData.map(h => new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        prices = historyData.map(h => h.price);
    }

    const startPrice = prices[0];
    const currentPrice = team.rating; 
    
    labels.push('Now');
    prices.push(currentPrice);

    const isUp = currentPrice >= startPrice;

    return { labels, prices, isUp };
  }, [historyData, team.rating]);

  const trendColor = chartData.isUp ? '#10b981' : '#f43f5e'; 
  const bgHex = chartData.isUp ? '16, 185, 129' : '244, 63, 94'; 

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    scales: {
      x: { display: false },
      y: { display: false, min: Math.min(...chartData.prices) * 0.95 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#171717',
        titleColor: '#a3a3a3',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        displayColors: false,
        callbacks: { label: (context: any) => `$${Number(context.raw).toFixed(2)}` }
      }
    },
    elements: {
      point: { radius: 0, hoverRadius: 4 },
      line: { tension: 0.4, borderWidth: 2 }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const finalChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Price',
        data: chartData.prices,
        borderColor: trendColor,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 160); 
          gradient.addColorStop(0, `rgba(${bgHex}, 0.5)`);
          gradient.addColorStop(1, `rgba(${bgHex}, 0)`);
          return gradient;
        },
        fill: true,
      },
    ],
  };

  // --- CALCULATION LOGIC ---
  const price = team.rating;
  const numValue = parseFloat(inputValue) || 0;
  
  let estimatedShares = 0;
  let estimatedTotal = 0;

  if (inputType === 'usd') {
    estimatedTotal = numValue;
    estimatedShares = numValue / price;
  } else {
    estimatedShares = numValue;
    estimatedTotal = numValue * price;
  }

  const isBuy = mode === 'buy';
  const theme = isBuy ? 'emerald' : 'rose';

  // --- SAFETY BUFFER ADDED HERE ---
  const handleSetPercentage = (percent: number) => {
    let value = 0;
    
    if (isBuy) {
        // --- BUY LOGIC ---
        let targetCash = cash * (percent / 100);
        
        // Safety buffer: Subtract 1 cent if buying 100% to avoid floating point errors
        if (percent === 100 && targetCash > 0.01) {
             targetCash -= 0.01;
        }
        
        value = inputType === 'usd' ? targetCash : targetCash / price;
        
        // Display: Always Floor to avoid over-budget
        if (inputType === 'usd') {
             setInputValue((Math.floor(value * 100) / 100).toFixed(2));
        } else {
             setInputValue((Math.floor(value * 10000) / 10000).toFixed(4));
        }

    } else {
        // --- SELL LOGIC ---
        
        // SPECIAL CASE: MAX SELL in SHARES mode
        // We pass the EXACT string to clear 'dust' perfectly
        if (percent === 100 && inputType === 'shares') {
             setInputValue(ownedShares.toString());
             return; 
        }

        const targetShares = ownedShares * (percent / 100);
        value = inputType === 'shares' ? targetShares : targetShares * price;

        if (inputType === 'usd') {
            // USD Mode: Floor to 2 decimals (Prevents "Insufficient Stocks" error)
            setInputValue((Math.floor(value * 100) / 100).toFixed(2));
        } else {
            // Shares Mode (Partial): Floor to 4 decimals
            setInputValue((Math.floor(value * 10000) / 10000).toFixed(4));
        }
    }
  };

  const handleTransaction = async () => {
    if (estimatedShares <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const functionName = isBuy ? 'buy_stock' : 'sell_stock';
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_team_name: team.name,
        p_quantity: estimatedShares,
        p_price: team.rating
      });

      if (rpcError) throw rpcError;
      if (data && data.success === false) throw new Error(data.message);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-20 bg-black/20 rounded-full p-1 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* SECTION 1: HEADER */}
        <div className="relative h-64 bg-gradient-to-b from-black/40 to-transparent p-8 flex flex-col justify-between border-b border-white/5 overflow-hidden">
          
          <div className="relative z-10">
            <div className="flex items-center gap-4">
               {team.logo && <img src={team.logo} className="w-16 h-16 object-contain drop-shadow-md bg-black/20 rounded-xl p-2" />}
               <div>
                  <h2 className="text-3xl font-bold text-white leading-none tracking-tight drop-shadow-md">{team.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-mono font-bold text-white drop-shadow-sm">${price.toFixed(2)}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded border shadow-sm ${chartData.isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {chartData.isUp ? '▲' : '▼'} Trend
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-36 z-0 opacity-40 pointer-events-none">
            {chartData.prices.length > 0 && (
                <Line data={finalChartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* SECTION 2: CONTROLS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-900/50">
          
          <div className="grid grid-cols-2 bg-black/20 border-b border-white/5">
            <button
              onClick={() => { setMode('buy'); setInputValue(''); setError(null); }}
              className={`py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                mode === 'buy' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => { setMode('sell'); setInputValue(''); setError(null); }}
              className={`py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                mode === 'sell' ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="p-8 space-y-6">
            
            <div className="bg-black/40 rounded-xl border border-white/5 p-5 relative ring-1 ring-white/5 focus-within:ring-emerald-500/50 transition-all">
              <button 
                onClick={() => {
                  if(inputValue) setInputValue(inputType === 'usd' ? estimatedShares.toFixed(4) : estimatedTotal.toFixed(2));
                  setInputType(inputType === 'usd' ? 'shares' : 'usd');
                }}
                className="absolute top-4 right-4 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-neutral-400"
              >
                {inputType === 'usd' ? 'USD' : 'Shares'} ⇄
              </button>

              <div className="text-xs uppercase font-bold text-neutral-500 mb-1">
                 {inputType === 'usd' ? 'Invest Amount' : 'Quantity'}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                 {inputType === 'usd' && <span className="text-3xl font-light text-neutral-600">$</span>}
                 <input 
                    type="number" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={`bg-transparent text-4xl font-bold text-white w-full focus:outline-none placeholder-neutral-800 font-mono ${inputType === 'shares' ? '' : '-ml-1'}`}
                    placeholder="0.00"
                    min="0"
                    autoFocus
                 />
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/5">
                {[10, 25, 50, 100].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => handleSetPercentage(percent)}
                        className={`text-xs font-bold py-1.5 rounded transition-colors ${
                            isBuy 
                             ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                             : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                        }`}
                    >
                        {percent === 100 ? 'MAX' : `${percent}%`}
                    </button>
                ))}
              </div>

              <div className="mt-3 text-right flex justify-between items-center text-xs">
                 <span className="text-neutral-500">{inputType === 'usd' ? 'Est. Shares' : 'Est. Cost'}</span>
                 <span className="font-mono text-neutral-300">
                    {inputType === 'usd' 
                      ? `${estimatedShares.toFixed(4)}`
                      : `$${estimatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                    }
                 </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm px-1">
               <div className="text-neutral-500">
                  {isBuy ? 'Cash Available' : 'Shares Owned'} 
               </div>
               <div className={`font-mono font-bold ${isBuy ? 'text-white' : 'text-neutral-300'}`}>
                  {isBuy ? `$${cash.toLocaleString()}` : ownedShares.toFixed(4)}
               </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs text-center animate-pulse">
                {error}
              </div>
            )}

            <button
              onClick={handleTransaction}
              disabled={loading || estimatedShares <= 0 || (isBuy ? estimatedTotal > cash : estimatedShares > ownedShares)}
              className={`w-full py-5 rounded-xl font-bold text-base uppercase tracking-widest transition-all duration-300 shadow-xl transform active:scale-[0.99] ${
                isBuy
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : (
                isBuy 
                  ? (estimatedTotal > cash ? 'Insufficient Funds' : 'Confirm Purchase')
                  : (estimatedShares > ownedShares ? 'Insufficient Shares' : 'Confirm Sale')
              )}
            </button>
          
          </div>
        </div>
      </div>
    </div>
  );
}