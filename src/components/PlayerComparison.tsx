import React, { useState, useMemo } from 'react';

// --- Types ---
interface CareerEntry {
  date: string;
  team: string;
  notes?: string[];
}
interface Player {
  slug: string;
  data: {
    name: string;
    role: string;
    team: string;
    headshot?: string;
    country?: string;
    flagUrl?: string;
    signatureHeroes?: string[];
    career?: CareerEntry[];
  };
}
interface Props {
  players: Player[];
}

// --- Helpers ---

// 1. Count Trophies (🏆)
function getTrophies(career: CareerEntry[] | undefined) {
  if (!career) return [];
  const trophies: string[] = [];
  career.forEach(entry => {
    if (entry.notes) {
      entry.notes.forEach(note => {
        if (note.includes('🏆')) {
          // Clean the text: "🏆 Won 2024 Finals" -> "2024 Finals"
          trophies.push(note.replace('🏆', '').replace(/^ Won /, '').trim());
        }
      });
    }
  });
  return trophies;
}

// 2. Calculate Years Active
function getYearsActive(career: CareerEntry[] | undefined) {
  if (!career || career.length === 0) return "Rookie";
  
  // Sort chronologically (oldest first)
  // Assuming your markdown is newest-first, we take the last entry
  const lastEntry = career[career.length - 1]; 
  const firstYear = lastEntry.date.match(/\d{4}/)?.[0];
  
  if (!firstYear) return "Unknown";
  return `${firstYear} – Present`;
}

export default function PlayerComparison({ players }: Props) {
  // Default to first two players (or empty)
  const [leftId, setLeftId] = useState(players[0]?.slug);
  const [rightId, setRightId] = useState(players[1]?.slug);

  const p1 = players.find(p => p.slug === leftId);
  const p2 = players.find(p => p.slug === rightId);

  // Cloudinary Helper
  const getHeadshot = (url?: string) => 
    url ? url.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,f_auto,q_auto/') : null;

  const getHeroIcon = (heroName: string, url?: string) => {
    if (!url) return null;
    const base = url.split('/upload/')[0] + '/upload';
    return `${base}/f_auto,q_auto:best/v1762938948/${heroName.toLowerCase()}.png`;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* --- HEADER / CONTROLS --- */}
      <div className="grid grid-cols-2 gap-4 p-6 border-b border-neutral-800 bg-neutral-950">
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 1</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none appearance-none"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 2</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none appearance-none"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
      </div>

      {/* --- THE FACE-OFF --- */}
      {(p1 && p2) && (
        <div className="grid grid-cols-2 divide-x divide-neutral-800 relative">
          
          {/* VS Badge */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-amber-500 text-black font-title font-bold text-2xl px-4 py-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] border-4 border-neutral-900 italic">
              VS
            </div>
          </div>

          {[p1, p2].map((p, i) => {
            const trophies = getTrophies(p.data.career);
            const years = getYearsActive(p.data.career);
            
            return (
              <div key={i} className="p-4 md:p-8 flex flex-col items-center text-center">
                
                {/* 1. HERO IMAGE */}
                <div className="relative w-40 h-40 md:w-56 md:h-56 mb-6 group">
                   {p.data.headshot && (
                    <img 
                      src={getHeadshot(p.data.headshot)} 
                      className="w-full h-full rounded-full border-4 border-neutral-800 object-cover shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:border-amber-500/50"
                    />
                   )}
                   {p.data.flagUrl && (
                     <img 
                       src={p.data.flagUrl} 
                       className="absolute bottom-2 right-2 w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-neutral-900 shadow-md"
                       title={p.data.country}
                     />
                   )}
                </div>

                {/* 2. IDENTITY */}
                <h2 className="text-4xl md:text-5xl font-title text-white mb-1">{p.data.name}</h2>
                <p className={`text-xl font-bold mb-8 ${
                  p.data.role === 'Tank' ? 'text-blue-400' : 
                  p.data.role === 'Damage' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {p.data.role}
                </p>

                {/* 3. THE TALE OF THE TAPE */}
                <div className="w-full space-y-6">
                  
                  {/* Experience */}
                  <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800/50">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Career Span</p>
                    <p className="text-lg text-white font-medium">{years}</p>
                  </div>

                  {/* Signature Heroes */}
                  <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800/50">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-3">Signature Heroes</p>
                    <div className="flex justify-center gap-3">
                      {p.data.signatureHeroes?.map(hero => (
                        <img 
                          key={hero}
                          src={getHeroIcon(hero,p.data.headshot)}
                          className="w-10 h-10 rounded bg-neutral-800 border border-neutral-700 p-0.5"
                          title={hero}
                        />
                      ))}
                    </div>
                  </div>

                  {/* TROPHY CASE (The Main Event) */}
                  <div className={`
                    p-5 rounded-xl border 
                    ${trophies.length > 0 ? 'bg-amber-950/20 border-amber-900/30' : 'bg-neutral-800/30 border-neutral-800/50'}
                  `}>
                    <p className="text-xs text-amber-500/80 uppercase tracking-wider font-bold mb-2">
                      Major Titles ({trophies.length})
                    </p>
                    
                    {trophies.length > 0 ? (
                      <ul className="space-y-2">
                        {trophies.map((t, idx) => (
                          <li key={idx} className="text-white font-medium flex items-center justify-center gap-2">
                            <span className="text-amber-400">🏆</span> 
                            <span className="text-sm md:text-base">{t}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-neutral-500 italic text-sm">No major titles yet</p>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}