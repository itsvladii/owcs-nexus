import React, { useState } from 'react';

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

// Keywords for "Major" Team Titles
const MAJOR_KEYWORDS = [
  "World Finals",
  "Grand Finals",
  "Midseason",
  "Major",
  "Esports World Cup",
  "Overwatch League 20"
];

// New Helper: Sort accolades into 3 buckets
function getAccolades(career: CareerEntry[] | undefined) {
  const accolades = {
    majorTeam: [] as string[],
    individual: [] as string[],
    minorTeam: [] as string[]
  };

  if (!career) return accolades;

  career.forEach(entry => {
    if (entry.notes) {
      entry.notes.forEach(note => {
        
        // 1. Check for Individual Awards (⭐, 🚀, 🎯)
        
        // 2. Check for Team Trophies (🏆)
        if (note.includes('🏆')) {
          const cleanText = note.replace('🏆', '').replace(/^ Won /, '').trim();
          
          // Split into Major vs Minor
          if (MAJOR_KEYWORDS.some(k => cleanText.includes(k))) {
            accolades.majorTeam.push(cleanText);
          } else {
            accolades.minorTeam.push(cleanText);
          }
        }
        else if (note.match(/[⭐🌏🚀🎯🛡️💊]/)) {
          // Clean text: remove emojis and trim
          const cleanText = note.replace(/[⭐🚀🎯🛡️💊]/g, '').trim();
          accolades.individual.push(cleanText);
        } 
      });
    }
  });

  return accolades;
}

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

  // Cloudinary Helpers
  const getHeadshot = (url?: string) => 
    url ? url.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,f_auto,q_auto/') : null;

  const getHeroIcon = ( heroName: string,url?: string) => {
    if (!url) return null;
    const base = url.split('/upload/')[0] + '/upload';
    return `${base}/f_auto,q_auto:best/v1762938909/${heroName.toLowerCase()}.png`;
  };

  if (!p1 || !p2) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* --- HEADER (Unchanged) --- */}
      <div className="grid grid-cols-2 gap-4 p-6 border-b border-neutral-800 bg-neutral-950">
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
        
       <div className="absolute left-1/2 top-32 md:top-48 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-amber-500 text-black font-title font-bold text-2xl px-4 py-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] border-4 border-neutral-900 italic">
            VS
          </div>
        </div>

        {[p1, p2].map((p, i) => {
          const { majorTeam, individual, minorTeam } = getAccolades(p.data.career);
          const years = getYearsActive(p.data.career);
          
          return (
            <div key={i} className="p-4 md:p-8 flex flex-col items-center text-center">
              
              <div className="
                relative w-full h-64 md:h-96 mb-6 
                bg-neutral-800/30 rounded-xl overflow-hidden border border-neutral-800
                shadow-lg group
              ">
                 {/* Angled Background */}
                 <div className="absolute inset-0 overflow-hidden -skew-y-3 bg-neutral-800/50 transform scale-110 origin-top"></div>

                 {p.data.flagUrl && (
                    <img 
                      src={p.data.flagUrl} 
                      alt={p.data.country}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                 {/* Player Image */}
                 {p.data.headshot && (
                  <img 
                    src={getHeadshot(p.data.headshot)} 
                    className="
                      absolute inset-0 w-full h-full 
                      object-contain object-top pt-4 
                      transition-transform duration-500 group-hover:scale-105
                    "
                  />
                 )}

                 {/* Gradient Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent"></div>

                 {/* Name & Role Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-title text-white mb-1 drop-shadow-md">{p.data.name}</h2>
                    <p className={`text-lg md:text-xl font-bold ${
                      p.data.role === 'Tank' ? 'text-blue-400' : 
                      p.data.role === 'Damage' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {p.data.role}
                    </p>
                 </div>
              </div>

              <div className="w-full space-y-6">
                
                {/* Stats Row (Career & Heroes) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                    <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Career Span</p>
                    <p className="text-md md:text-lg text-white font-medium">{years}</p>
                  </div>
                  <div className="bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                    <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-wider font-bold mb-2">Signature</p>
                    <div className="flex justify-center gap-2">
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
                </div>

                {/* 1. MAJOR TITLES (Gold) */}
                <div className={`
                  p-4 rounded-xl border 
                  ${majorTeam.length > 0 ? 'bg-amber-950/20 border-amber-900/30' : 'bg-neutral-800/30 border-neutral-800/50'}
                `}>
                  <p className="text-xs text-amber-500 uppercase tracking-wider font-bold mb-3 flex items-center justify-center gap-2">
                    <span className="text-lg">🏆</span> Major Titles ({majorTeam.length})
                  </p>
                  {majorTeam.length > 0 ? (
                    <ul className="space-y-1">
                      {majorTeam.map((t, idx) => (
                        <li key={idx} className="text-white font-bold text-sm md:text-base">{t}</li>
                      ))}
                    </ul>
                  ) : <p className="text-neutral-600 italic text-sm">None</p>}
                </div>

                {/* 2. INDIVIDUAL AWARDS (New Section - Purple/Pink) */}
                <div className={`
                  p-4 rounded-xl border 
                  ${individual.length > 0 ? 'bg-fuchsia-950/20 border-fuchsia-900/30' : 'bg-neutral-800/30 border-neutral-800/50'}
                `}>
                  <p className="text-xs text-fuchsia-400 uppercase tracking-wider font-bold mb-3 flex items-center justify-center gap-2">
                    <span className="text-lg">⭐</span> Individual Awards ({individual.length})
                  </p>
                  {individual.length > 0 ? (
                    <ul className="space-y-1">
                      {individual.map((t, idx) => (
                        <li key={idx} className="text-white font-medium text-sm md:text-base">{t}</li>
                      ))}
                    </ul>
                  ) : <p className="text-neutral-600 italic text-sm">None</p>}
                </div>

                {/* 3. REGIONAL TITLES (Silver/Grey) */}
                {minorTeam.length > 0 && (
                  <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-3">
                      Regional Wins ({minorTeam.length})
                    </p>
                    <ul className="space-y-1">
                      {minorTeam.map((t, idx) => (
                        <li key={idx} className="text-neutral-400 text-xs">{t}</li>
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