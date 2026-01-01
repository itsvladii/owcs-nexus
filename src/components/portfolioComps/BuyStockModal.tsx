import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import TeamLineChart from './TeamStockChart';
interface TradeModalProps {
  team: {
    name: string;
    rating: number; 
    logo: string | null;
    logo_dark?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// --- ORACLE LOGIC ---
function getAiInsight(history: { price: number }[], currentPrice: number, teamName: string) {
    if (!history || history.length < 2) return { sentiment: 'neutral', text: "Awaiting more data for analysis.", icon: '🤔', color: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20' };

    const lookbackIndex = Math.max(0, history.length - 6); 
    const startPrice = history[lookbackIndex].price;
    const priceChange = currentPrice - startPrice;
    const percentChange = (priceChange / startPrice) * 100;

    if (percentChange > 3) {
        return { 
            sentiment: 'bullish', 
            text: `ROCKET SHIP. ${teamName} is heating up (+${percentChange.toFixed(1)}%). High momentum detected.`, 
            icon: '🚀',
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        };
    } else if (percentChange > 0) {
        return { 
            sentiment: 'positive', 
            text: `Solid form. ${teamName} is ticking upward (+${percentChange.toFixed(1)}%). A safe short-term hold.`, 
            icon: '✅',
            color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
        };
    } else if (percentChange < -3) {
        return { 
            sentiment: 'bearish', 
            text: `FALLING KNIFE. ${teamName} dropped ${Math.abs(percentChange).toFixed(1)}% recently. Do not catch.`, 
            icon: '🔪',
            color: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
        };
    } else {
        return { 
            sentiment: 'negative', 
            text: `Cold streak. ${teamName} is struggling to find wins. Wait for a turnaround.`, 
            icon: '🧊',
            color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        };
    }
}

export default function BuyStockModal({ team, onClose, onSuccess }: TradeModalProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [inputType, setInputType] = useState<'usd' | 'shares'>('usd');
  const [inputValue, setInputValue] = useState<string>(''); 
  const [activeTab, setActiveTab] = useState<'price' | 'impact' | 'dominance'>('price');

  const [cash, setCash] = useState(0);
  const [ownedShares, setOwnedShares] = useState(0);
  const [historyData, setHistoryData] = useState<{date: string, price: number}[]>([]); 
  const [rawHistory, setRawHistory] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txDetails, setTxDetails] = useState<{ qty: number, type: 'buy' | 'sell' } | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [balanceRes, portfolioRes, historyRes] = await Promise.all([
        supabase.from('profiles').select('cash').eq('id', user.id).single(),
        supabase.from('portfolio').select('quantity').eq('user_id', user.id).eq('team_name', team.name).single(),
        supabase.from('matches').select('*').or(`team_a.eq.${team.name},team_b.eq.${team.name}`).order('date', { ascending: false }).limit(50)
      ]);

      if (balanceRes.data) setCash(balanceRes.data.cash);
      if (portfolioRes.data) setOwnedShares(portfolioRes.data.quantity);
      
      if (historyRes.data) {
        setRawHistory(historyRes.data); 
        const points = historyRes.data.map(match => {
          const price = match.team_a === team.name ? match.team_a_elo_after : match.team_b_elo_after;
          return { date: match.date, price: price };
        }).reverse(); 
        setHistoryData(points);
      }
    }
    loadData();
  }, [team.name]);

  const isTrendUp = useMemo(() => {
     if (historyData.length === 0) return true;
     return team.rating >= historyData[0].price;
  }, [historyData, team.rating]);

  const aiInsight = useMemo(() => {
      const simpleHistory = historyData.map(p => ({ price: p.price }));
      return getAiInsight(simpleHistory, team.rating, team.name);
  }, [historyData, team]);

  const price = team.rating;
  const numValue = parseFloat(inputValue) || 0;
  const estimatedShares = inputType === 'usd' ? numValue / price : numValue;
  const estimatedTotal = inputType === 'usd' ? numValue : numValue * price;
  const isBuy = mode === 'buy';

  const handleSetPercentage = (percent: number) => {
    let value = 0;
    if (isBuy) {
        let targetCash = cash * (percent / 100);
        if (percent === 100 && targetCash > 0.01) targetCash -= 0.01; 
        value = inputType === 'usd' ? targetCash : targetCash / price;
    } else {
        if (percent === 100 && inputType === 'shares') { setInputValue(ownedShares.toString()); return; }
        const targetShares = ownedShares * (percent / 100);
        value = inputType === 'shares' ? targetShares : targetShares * price;
    }
    setInputValue(inputType === 'usd' ? (Math.floor(value * 100) / 100).toFixed(2) : (Math.floor(value * 10000) / 10000).toFixed(4));
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
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" /> 
           <div className="relative w-full max-w-sm bg-neutral-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/30">
                 <div className="text-3xl">✅</div>
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

  // --- RESPONSIVE LAYOUT FIX ---
  // We use `flex-col` for mobile and `lg:flex-row` for desktop.
  // We use `h-auto` for mobile and `lg:h-[85vh]` for desktop.
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-6xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col lg:flex-row h-[90vh] lg:h-[85vh]">
        
        {/* CLOSE BUTTON */}
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-20 bg-black/40 rounded-full p-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* === LEFT COLUMN: CHART MFD === */}
        {/* Mobile: Order 1 (Top). Desktop: Width 2/3 */}
        <div className="w-full lg:w-2/3 flex flex-col h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 p-4 lg:p-8 bg-black/20 overflow-hidden">
            
            {/* A. Header Info */}
            <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div className="flex items-center gap-3 lg:gap-4">
                    {(team.logo_dark || team.logo) && (
                        <img src={team.logo_dark || team.logo || ''} className="w-10 h-10 lg:w-16 lg:h-16 object-contain drop-shadow-md bg-white/5 rounded-xl p-2" />
                    )}
                    <div>
                        <h2 className="text-xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none">{team.name}</h2>
                        <div className="flex items-center gap-2 lg:gap-3 mt-1 lg:mt-2">
                             <span className="text-lg lg:text-2xl font-mono font-bold text-neutral-200">₵{price.toFixed(2)}</span>
                             <span className={`text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded border uppercase tracking-wider ${isTrendUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {isTrendUp ? '▲ Bullish' : '▼ Bearish'}
                            </span>
                        </div>
                    </div>
                </div>

            </div>


            {/* C. The Chart Area */}
            <div className="flex-1 min-h-0 bg-neutral-900/50 rounded-xl border border-white/5 p-2 lg:p-4 relative overflow-hidden">
                 {activeTab === 'price' && <TeamLineChart history={historyData} />}
            </div>
            
            {/* D. Context Label */}
            <div className="mt-2 lg:mt-4 text-center hidden lg:block">
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
                    {activeTab === 'price' && "Live Price Action • Last 50 Matches"}
                    {activeTab === 'impact' && "ELO Gain/Loss Per Match"}
                    {activeTab === 'dominance' && "Performance Breakdown by Region"}
                </p>
            </div>
        </div>

        {/* === RIGHT COLUMN: CONTROLS === */}
        {/* Mobile: Order 2 (Bottom). Desktop: Width 1/3. Scrollable. */}
        <div className="w-full lg:w-1/3 flex flex-col h-1/2 lg:h-full bg-neutral-900/80 overflow-y-auto custom-scrollbar border-l border-white/5">
            
            {/* A. Oracle Insight */}
            <div className={`m-4 lg:m-6 p-3 lg:p-4 rounded-xl border flex items-start gap-3 ${aiInsight.color}`}>
                   <div className="text-lg lg:text-2xl">{aiInsight.icon}</div>
                   <div>
                      <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Oracle Insight</div>
                      <div className="text-xs lg:text-sm font-medium leading-snug">{aiInsight.text}</div>
                   </div>
            </div>

            {/* B. Buy/Sell Toggle */}
            <div className="px-4 lg:px-6 pb-0">
                <div className="grid grid-cols-2 bg-black/40 border border-white/5 rounded-t-xl overflow-hidden">
                    <button onClick={() => { setMode('buy'); setInputValue(''); }} className={`py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${mode === 'buy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-white'}`}>Buy</button>
                    <button onClick={() => { setMode('sell'); setInputValue(''); }} className={`py-3 lg:py-4 text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${mode === 'sell' ? 'text-rose-400 bg-rose-500/10 border-rose-500' : 'text-neutral-500 border-transparent hover:text-white'}`}>Sell</button>
                </div>
            </div>

            {/* C. Inputs */}
            <div className="px-4 lg:px-6 flex-1 pb-6 lg:pb-0">
                <div className="bg-black/40 border border-t-0 border-white/5 rounded-b-xl p-4 lg:p-5 space-y-4 lg:space-y-6 shadow-inner">
                    
                    {/* Input Field */}
                    <div className="relative ring-1 ring-white/5 focus-within:ring-emerald-500/50 transition-all rounded-lg bg-black/20 p-3 lg:p-4">
                        <button onClick={() => setInputType(inputType === 'usd' ? 'shares' : 'usd')} className="absolute top-3 right-3 text-[9px] lg:text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-neutral-400">{inputType === 'usd' ? 'USD' : 'Shares'} ⇄</button>
                        <div className="text-[9px] lg:text-[10px] uppercase font-bold text-neutral-500 mb-1">{inputType === 'usd' ? 'Invest Amount' : 'Quantity'}</div>
                        <div className="flex items-center gap-2">
                            {inputType === 'usd' && <span className="text-xl lg:text-2xl font-light text-neutral-600">₵</span>}
                            <input 
                                type="number" 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value)} 
                                className={`bg-transparent text-2xl lg:text-3xl font-bold text-white w-full focus:outline-none font-mono ${inputType === 'shares' ? '' : '-ml-1'}`} 
                                placeholder="0.00" 
                                min="0" 
                            />
                        </div>
                    </div>

                    {/* Percentage Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {[10, 25, 50, 100].map((percent) => (
                            <button 
                                key={percent} 
                                onClick={() => handleSetPercentage(percent)} 
                                className={`text-[9px] lg:text-[10px] font-bold py-2 rounded transition-colors border ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'}`}
                            >
                                {percent === 100 ? 'MAX' : `${percent}%`}
                            </button>
                        ))}
                    </div>

                    {/* Transaction Summary */}
                    <div className="space-y-2 pt-2 lg:pt-4 border-t border-white/5 text-[10px] lg:text-xs">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">{inputType === 'usd' ? 'Est. Shares' : 'Est. Cost'}</span>
                            <span className="font-mono text-white">{inputType === 'usd' ? estimatedShares.toFixed(4) : `₵${estimatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">{isBuy ? 'Cash Available' : 'Shares Owned'}</span>
                            <span className="font-mono font-bold text-neutral-300">{isBuy ? `₵${cash.toLocaleString()}` : ownedShares.toFixed(4)}</span>
                        </div>
                    </div>
                </div>

                {/* D. Error & Action */}
                {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs text-center animate-pulse">{error}</div>}

                <button 
                    onClick={handleTransaction} 
                    disabled={loading || estimatedShares <= 0 || (isBuy ? estimatedTotal > cash : estimatedShares > ownedShares)} 
                    className={`w-full mt-4 lg:mt-6 py-3 lg:py-4 rounded-xl font-black text-xs lg:text-sm uppercase tracking-widest transition-all shadow-lg transform active:scale-[0.99] ${isBuy ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? 'Processing...' : (isBuy ? 'Confirm Purchase' : 'Confirm Sale')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}