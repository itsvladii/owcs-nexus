import { useState } from 'react';
import StockMarket from './StockMarket'; 
import PortfolioDashboard from './PortfolioDashboard';

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');

  return (
    <div className="w-full max-w-7xl mx-auto">
      
      {/* --- TAB NAVIGATION --- */}
      <div className="flex justify-center mb-8 sticky top-4 z-40">
        <div className="bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800 shadow-2xl inline-flex gap-1">
          
          <button
            onClick={() => setActiveTab('market')}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              activeTab === 'market'
                ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/10'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
            }`}
          >
            🌍 Market
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              activeTab === 'portfolio'
                ? 'bg-emerald-900/30 text-emerald-400 shadow-lg border border-emerald-500/30'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
            }`}
          >
            💼 My Portfolio
          </button>

        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="min-h-[500px]">
        {activeTab === 'market' ? (
          <StockMarket />
        ) : (
          <PortfolioDashboard />
        )}
      </div>

    </div>
  );
}