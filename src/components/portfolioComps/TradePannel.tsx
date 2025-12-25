import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';
import { getRiskRating } from '../../lib/contentScripts/marketRating';
import InteractiveChart from '../builderComps/InteractiveChart';

// --- TYPES ---
interface TeamData {
  name: string;
  rating: number; 
  logo?: string | null;
  history?: { date: string; elo: number }[];
}

interface TradePanelProps {
  team: TeamData | null;
  userCash: number;
  userHoldings: Record<string, number>;
  onClose: () => void;
  onSuccess: () => void;
}


export default function TradePanel({ team, userCash, userHoldings, onClose, onSuccess }: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amountStr, setAmountStr] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setAmountStr('');
    setMessage(null);
    setMode('buy');
  }, [team]);

  // Process Data for SVG (Just an array of numbers)
  const chartPoints = useMemo(() => {
    if (!team?.history) return [];
    // Take last 20 points, convert ELO to Price
    return team.history.slice(-20).map(h => h.elo / 10);
  }, [team]);

  // Determine Trend Color
  const isUp = chartPoints.length > 1 && chartPoints[chartPoints.length - 1] >= chartPoints[0];
  const chartColor = isUp ? "#10B981" : "#EF4444"; // Emerald or Red
  const risk = team ? getRiskRating(team.rating * 10) : { grade: '-', color: '', label: '' };

  if (!team) return null;

  const price = team.rating;
  const ownedQuantity = userHoldings[team.name] || 0;
  const ownedValue = ownedQuantity * price;
  const amount = parseFloat(amountStr) || 0;
  const sharesCalculated = amount / price;
  const availableFunds = mode === 'buy' ? userCash : ownedValue;
  const isValid = amount > 0 && amount <= (availableFunds + 0.01); 

  const setSafeAmount = (val: number) => {
    let safeVal = val;
    if (mode === 'buy' && safeVal >= userCash) safeVal = Math.max(0, userCash - 0.01);
    setAmountStr(safeVal.toFixed(2));
  };

  const handleTrade = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const functionName = mode === 'buy' ? 'buy_stock' : 'sell_stock';
      const { data, error } = await supabase.rpc(functionName, {
        p_team_name: team.name,
        p_quantity: sharesCalculated,
        p_price: price
      });

      if (error) throw error;
      if (data.success) {
        setMessage(`Successfully ${mode === 'buy' ? 'bought' : 'sold'}!`);
        setTimeout(() => { onSuccess(); onClose(); }, 1000);
      } else {
        setMessage(data.message);
      }
    } catch (err: any) {
      setMessage(err.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl p-6 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {team.logo && <img src={team.logo} className="w-12 h-12 object-contain" />}
          <div>
            <h2 className="text-xl font-bold text-white leading-none tracking-wide">{team.name}</h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${risk.color}`}>
            {risk.grade}
          </span>
            <p className="text-emerald-500 font-mono font-bold mt-1">${price.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl">✕</button>
      </div>

      {/* GRAPH CONTAINER (Fixed Height, Safe) */}
      <div className="h-32 w-full mb-6 relative">
    {/* Use a taller height (130px) for the main panel */}
    <InteractiveChart history={team.history || []} height={130} />
</div>

      {/* TOGGLE */}
      <div className="flex bg-black p-1 rounded-lg mb-6">
        <button 
          onClick={() => { setMode('buy'); setAmountStr(''); }}
          className={`flex-1 py-3 rounded-md text-sm font-bold uppercase  tracking-widest transition-all ${mode === 'buy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
        >
          Buy
        </button>
        <button 
          onClick={() => { setMode('sell'); setAmountStr(''); }}
          className={`flex-1 py-3 rounded-md text-sm font-bold uppercase tracking-widest transition-all ${mode === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
        >
          Sell
        </button>
      </div>

      {/* INPUT AREA */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-xs font-bold uppercase text-neutral-500 tracking-wider">
            <span>{mode === 'buy' ? 'Invest Amount' : 'Sell Amount'}</span>
            <span className="text-white cursor-pointer hover:underline" onClick={() => setSafeAmount(availableFunds)}>
                Max: ${availableFunds.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
        </div>
        
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-xl font-mono">$</span>
            <input 
                type="number"
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-4 pl-10 pr-20 text-white text-2xl font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
            />
            <button 
                onClick={() => setSafeAmount(availableFunds)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-emerald-400 px-2 py-1 rounded uppercase"
            >
                Max
            </button>
        </div>

        <div className="text-right text-xs text-neutral-500 font-mono">
            ≈ {sharesCalculated > 0 ? sharesCalculated.toFixed(4) : '0.0000'} shares
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2 mb-6 mt-auto">
        <div className="flex justify-between text-sm text-neutral-400">
          <span>{mode === 'buy' ? 'Wallet Balance' : 'Position Value'}</span>
          <span className="font-mono text-white">${availableFunds.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="flex justify-between text-sm text-neutral-400">
            <span>{mode === 'buy' ? 'Remaining' : 'Remaining Value'}</span>
            <span className="font-mono text-white">
                ${Math.max(0, availableFunds - amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </span>
        </div>
      </div>

      {/* CONFIRM BUTTON */}
      <div>
        {message && <div className={`mb-4 text-center text-sm font-bold py-3 rounded-lg ${message.includes('success') || message.includes('Success') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{message}</div>}
        
        <button
          disabled={!isValid || isSubmitting}
          onClick={handleTrade}
          className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest font-title transition-all shadow-lg ${
            !isValid 
              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' 
              : mode === 'buy' 
                ? 'bg-white hover:bg-emerald-400 text-black shadow-emerald-900/20' 
                : 'bg-white hover:bg-red-400 text-black shadow-red-900/20'
          }`}
        >
          {isSubmitting ? 'Processing...' : `Confirm ${mode}`}
        </button>
      </div>
    </div>
  );
}