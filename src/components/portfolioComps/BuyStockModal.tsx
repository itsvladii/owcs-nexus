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

// --- NEW: THE ORACLE LOGIC ---
function getAiInsight(history: { price: number }[], currentPrice: number, teamName: string) {
    // Safety check
    if (!history || history.length < 2) return { sentiment: 'neutral', text: "Not enough data to analyze trends.", icon: '🤔' };

    // 1. DETERMINE TIMEFRAME
    // We want the last 5 games for "Current Form". 
    // If history is shorter than 5, use what we have.
    const lookbackIndex = Math.max(0, history.length - 6); 
    const startPrice = history[lookbackIndex].price;
    
    // Calculate change over this short window
    const priceChange = currentPrice - startPrice;
    const percentChange = (priceChange / startPrice) * 100;

    // 2. MOONING (Up > 3% in last 5 games) - Lower threshold for short term
    if (percentChange > 3) {
        return { 
            sentiment: 'bullish', 
            text: `${teamName} is heating up (+${percentChange.toFixed(1)}% recently). Easy dividend pay, but high stock price.`, 
            icon: '🚀',
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        };
    }
    // 3. DOING GOOD (Up > 0%)
    else if (percentChange > 0) {
        return { 
            sentiment: 'positive', 
            text: `Solid form. ${teamName} is ticking upward (+${percentChange.toFixed(1)}%). A safe short-term hold.`, 
            icon: '✅',
            color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
        };
    }
    // 4. CRASHING (Down > 3% in last 5 games)
    else if (percentChange < -3) {
        return { 
            sentiment: 'bearish', 
            text: `FALLING KNIFE. ${teamName} dropped ${Math.abs(percentChange).toFixed(1)}% in the last few matches. Do not catch.`, 
            icon: '🔪',
            color: 'text-red-500 bg-red-500/10 border-red-500/20'
        };
    }
    // 5. DOING BAD (Down > 0%)
    else {
        return { 
            sentiment: 'negative', 
            text: `Cold streak. ${teamName} is struggling to find wins recently. Wait for a turnaround.`, 
            icon: '🧊', // Changed icon to Ice for "Cold"
            color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        };
    }
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

  // Success State
  const [success, setSuccess] = useState(false);
  const [txDetails, setTxDetails] = useState<{ qty: number, type: 'buy' | 'sell' } | null>(null);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const balancePromise = supabase.from('profiles').select('cash').eq('id', user.id).single();
      const portfolioPromise = supabase.from('portfolio').select('quantity').eq('user_id', user.id).eq('team_name', team.name).single();
      const historyPromise = supabase.from('matches').select('date, team_a, team_b, team_a_elo_after, team_b_elo_after').or(`team_a.eq.${team.name},team_b.eq.${team.name}`).order('date', { ascending: false }).limit(30); 

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

  // --- NEW: GENERATE INSIGHT ---
  // We calculate this based on the chartData we just prepared
  const aiInsight = useMemo(() => {
      // Create a simplified history array for the AI function
      const simpleHistory = chartData.prices.map(p => ({ price: p }));
      return getAiInsight(simpleHistory, team.rating, team.name);
  }, [chartData, team]);

  const trendColor = chartData.isUp ? '#10b981' : '#f43f5e'; 
  const bgHex = chartData.isUp ? '16, 185, 129' : '244, 63, 94'; 

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    scales: { x: { display: false }, y: { display: false, min: Math.min(...chartData.prices) * 0.95 } },
    plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index' as const, intersect: false } },
    elements: { point: { radius: 0, hoverRadius: 4 }, line: { tension: 0.4, borderWidth: 2 } },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
  };

  const finalChartData = {
    labels: chartData.labels,
    datasets: [{
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
    }],
  };

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

  const handleSetPercentage = (percent: number) => {
    let value = 0;
    if (isBuy) {
        let targetCash = cash * (percent / 100);
        if (percent === 100 && targetCash > 0.01) targetCash -= 0.01;
        value = inputType === 'usd' ? targetCash : targetCash / price;
        setInputValue(inputType === 'usd' ? (Math.floor(value * 100) / 100).toFixed(2) : (Math.floor(value * 10000) / 10000).toFixed(4));
    } else {
        if (percent === 100 && inputType === 'shares') { setInputValue(ownedShares.toString()); return; }
        const targetShares = ownedShares * (percent / 100);
        value = inputType === 'shares' ? targetShares : targetShares * price;
        setInputValue(inputType === 'usd' ? (Math.floor(value * 100) / 100).toFixed(2) : (Math.floor(value * 10000) / 10000).toFixed(4));
    }
  };

  const handleTransaction = async () => {
    if (estimatedShares <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const functionName = isBuy ? 'buy_stock' : 'sell_stock';
      const { data, error: rpcError } = await supabase.rpc(functionName, { p_team_name: team.name, p_quantity: estimatedShares, p_price: team.rating });
      if (rpcError) throw rpcError;
      if (data && data.success === false) throw new Error(data.message);
      setTxDetails({ qty: estimatedShares, type: isBuy ? 'buy' : 'sell' });
      setSuccess(true); 
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setLoading(false);
    }
  };

  if (success && txDetails) {
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" /> 
           <div className="relative w-full max-w-sm bg-neutral-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/30">
                 <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Order Filled</h2>
              <p className="text-neutral-400 mb-6">
                 You successfully {txDetails.type === 'buy' ? 'bought' : 'sold'}{' '}
                 <span className="text-white font-bold">{txDetails.qty.toFixed(4)}</span> shares of{' '}
                 <span className="text-emerald-400 font-bold">{team.name}</span>.
              </p>
              <button onClick={() => { onSuccess(); }} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all">Done</button>
           </div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-20 bg-black/20 rounded-full p-1 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* SECTION 1: HEADER & CHART */}
        <div className="relative h-64 bg-gradient-to-b from-black/40 to-transparent p-8 flex flex-col justify-between border-b border-white/5 overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
               {team.logo_dark && <img src={team.logo_dark} className="w-16 h-16 object-contain drop-shadow-md bg-black/20 rounded-xl p-2" />}
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
          <div className="absolute inset-x-0 bottom-0 h-36 z-0 opacity-40 pointer-events-none">
            {chartData.prices.length > 0 && <Line data={finalChartData} options={chartOptions} />}
          </div>
        </div>

        {/* SECTION 2: CONTROLS & AI INSIGHT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-900/50">
          
          {/* --- NEW: AI INSIGHT CARD --- */}
          <div className={`mx-8 mt-6 p-4 rounded-xl border flex items-start gap-3 ${aiInsight.color}`}>
             <div className="text-xl">{aiInsight.icon}</div>
             <div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Nexus Oracle Insight</div>
                <div className="text-sm font-medium leading-snug">{aiInsight.text}</div>
             </div>
          </div>

          <div className="grid grid-cols-2 bg-black/20 border-b border-white/5 mt-6">
            <button onClick={() => { setMode('buy'); setInputValue(''); }} className={`py-4 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'buy' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-neutral-500 hover:text-white'}`}>Buy</button>
            <button onClick={() => { setMode('sell'); setInputValue(''); }} className={`py-4 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'sell' ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5' : 'text-neutral-500 hover:text-white'}`}>Sell</button>
          </div>

          <div className="p-8 space-y-6 pt-6">
             {/* Input Area (Same as before) */}
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
                    {inputType === 'usd' ? `${estimatedShares.toFixed(4)}` : `$${estimatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                 </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm px-1">
               <div className="text-neutral-500">{isBuy ? 'Cash Available' : 'Shares Owned'}</div>
               <div className={`font-mono font-bold ${isBuy ? 'text-white' : 'text-neutral-300'}`}>
                  {isBuy ? `$${cash.toLocaleString()}` : ownedShares.toFixed(4)}
               </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs text-center animate-pulse">{error}</div>}

            <button
              onClick={handleTransaction}
              disabled={loading || estimatedShares <= 0 || (isBuy ? estimatedTotal > cash : estimatedShares > ownedShares)}
              className={`w-full py-5 rounded-xl font-bold text-base uppercase tracking-widest transition-all duration-300 shadow-xl transform active:scale-[0.99] ${
                isBuy
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : (isBuy ? (estimatedTotal > cash ? 'Insufficient Funds' : 'Confirm Purchase') : (estimatedShares > ownedShares ? 'Insufficient Shares' : 'Confirm Sale'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}