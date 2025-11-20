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

// 1. Categorize Trophies
// We define keywords that elevate a trophy to "Major" status
const MAJOR_KEYWORDS = [
  "World Finals",
  "Grand Finals",
  "Midseason",
  "Major",
  "Esports World Cup",
  "Overwatch League 20" // Matches "Overwatch League 2022", etc.
];

function getTrophies(career: CareerEntry[] | undefined) {
  if (!career) return { major: [], minor: [] };
  
  const major: string[] = [];
  const minor: string[] = [];

  career.forEach(entry => {
    if (entry.notes) {
      entry.notes.forEach(note => {
        if (note.includes('🏆')) {
          // Clean the text
          const cleanName = note.replace('🏆', '').replace(/^ Won /, '').trim();
          
          // Check if it's a Major
          const isMajor = MAJOR_KEYWORDS.some(keyword => cleanName.includes(keyword));
          
          if (isMajor) {
            major.push(cleanName);
          } else {
            minor.push(cleanName);
          }
        }
      });
    }
  });
  return { major, minor };
}

// 2. Calculate Years Active (Unchanged)
function getYearsActive(career: CareerEntry[] | undefined) {
  if (!career || career.length === 0) return "Rookie";
  const lastEntry = career[career.length - 1]; 
  const firstYear = lastEntry.date.match(/\d{4}/)?.[0];
  if (!firstYear) return "Unknown";
  return `${firstYear} – Present`;
}

export default function PlayerComparison({ players }: Props) {
  const [leftId, setLeftId] = useState(players[0]?.slug);
  const [rightId, setRightId] = useState(players[1]?.slug);

  const p1 = players.find(p => p.slug === leftId);
  const p2 = players.find(p => p.slug === rightId);

  const getHeadshot = (url?: string) => 
    url ? url.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,f_auto,q_auto/') : null;

  const getHeroIcon = (url?: string, heroName: string) => {
    if (!url) return null;
    const base = url.split('/upload/')[0] + '/upload';
    return `${base}/f_auto,q_auto:best/v1762938909/${heroName.toLowerCase()}.png`;
  };

  if (!p1 || !p2) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* --- HEADER / CONTROLS --- */}
      <div className="grid grid-cols-2 gap-4 p-6 border-b border-neutral-800 bg-neutral-950">
        {/* (Same dropdown controls as before) */}
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 1</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 outline-none"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 2</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 outline-none"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
      </div>

      {/* --- THE FACE-OFF --- */}
      <div className="grid grid-cols-2 divide-x divide-neutral-800 relative">
        
        {/* VS Badge */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-amber-500 text-black font-title font-bold text-2xl px-4 py-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] border-4 border-neutral-900 italic">
            VS
          </div>
        </div>

        {[p1, p2].map((p, i) => {
          const { major, minor } = getTrophies(p.data.career);
          const years = getYearsActive(p.data.career);
          
          return (
            <div key={i} className="p-4 md:p-8 flex flex-col items-center text-center">
              
              {/* 1. HERO IMAGE & INFO */}
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
                      className="absolute bottom-2 right-2 w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-neutral-900 shadow-md object-cover flex-shrink-0"
                      title={p.data.country}
                    />
                  )}
              </div>

              <h2 className="text-4xl md:text-5xl font-title text-white mb-1">{p.data.name}</h2>
              <p className={`text-xl font-bold mb-8 ${
                p.data.role === 'Tank' ? 'text-blue-400' : 
                p.data.role === 'Damage' ? 'text-red-400' : 'text-green-400'
              }`}>
                {p.data.role}
              </p>

              <div className="w-full space-y-6">
                {/* Experience & Heroes (Same as before) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800/50">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Career Span</p>
                    <p className="text-lg text-white font-medium">{years}</p>
                  </div>
                  <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800/50">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-2">Signature Heroes</p>
                    <div className="flex justify-center gap-2">
                      {p.data.signatureHeroes?.map(hero => (
                        <img 
                          key={hero}
                          src={getHeroIcon(p.data.headshot, hero)}
                          className="w-10 h-10 rounded bg-neutral-800 border border-neutral-700 p-0.5"
                          title={hero}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* --- NEW: SPLIT TROPHY CASE --- */}
                
                {/* 1. Major Titles (Gold) */}
                <div className={`
                  p-5 rounded-xl border 
                  ${major.length > 0 ? 'bg-amber-950/20 border-amber-900/30' : 'bg-neutral-800/30 border-neutral-800/50'}
                `}>
                  <p className="text-xs text-amber-500 uppercase tracking-wider font-bold mb-3 flex items-center justify-center gap-2">
                    <span className="text-lg">🏆</span> Major Titles ({major.length})
                  </p>
                  {major.length > 0 ? (
                    <ul className="space-y-2">
                      {major.map((t, idx) => (
                        <li key={idx} className="text-white font-bold text-sm md:text-base">
                          {t}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-neutral-600 italic text-sm">None yet</p>
                  )}
                </div>

                {/* 2. Regional & Other (Silver) */}
                {minor.length > 0 && (
                  <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-3">
                      Regional & Other Wins ({minor.length})
                    </p>
                    <ul className="space-y-2">
                      {minor.map((t, idx) => (
                        <li key={idx} className="text-neutral-300 font-medium text-sm">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}