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
interface Team {
  slug: string;
  data: {
    name: string;
    logo?: string;
    colour?: string;
  };
}
interface Props {
  players: Player[];
  teams: Team[];
}

// --- Helpers ---
const MAJOR_KEYWORDS = ["World Finals", "Grand Finals", "Midseason", "Major", "Esports World Cup", "Overwatch League","Champions"];

function getAccolades(career: CareerEntry[] | undefined) {
  const accolades = { majorTeam: [] as string[], individual: [] as string[], minorTeam: [] as string[] };
  if (!career) return accolades;
  career.forEach(entry => {
    if (entry.notes) {
      entry.notes.forEach(note => {
        // 1. Team Trophies
        if (note.includes('🏆')) {
          const cleanText = note.replace('🏆', '').replace(/^ Won /, '').trim();
          if (MAJOR_KEYWORDS.some(k => cleanText.includes(k))) {
            accolades.majorTeam.push(cleanText);
          } else {
            accolades.minorTeam.push(cleanText);
          }
        } 
        // 2. Individual Awards
        else if (note.match(/[⭐🌏🚀🎯🛡️💊]/)) {
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
  return firstYear ? `${firstYear} – Present` : "Unknown";
}

const getTeamColor = (teams: Team[], teamSlug: string) => {
    const t = teams.find(team => team.slug === teamSlug);
    return t?.data?.colour || '#f59e0b';
};

const getTeamLogo = (teams: Team[], teamSlug: string) => {
    const t = teams.find(team => team.slug === teamSlug);
    return t?.data?.logo || null;
};

export default function PlayerComparison({ players, teams }: Props) {
  const [leftId, setLeftId] = useState(players[0]?.slug);
  const [rightId, setRightId] = useState(players[1]?.slug);

  const p1 = players.find(p => p.slug === leftId);
  const p2 = players.find(p => p.slug === rightId);

  const p1Color = p1 ? getTeamColor(teams, p1.data.team) : '#525252';
  const p2Color = p2 ? getTeamColor(teams, p2.data.team) : '#525252';

  const getHeroIcon = (heroName: string, url?: string) => {
    const base = url ? url.split('/upload/')[0] + '/upload' : 'https://res.cloudinary.com/dm1bfprgq/image/upload';
    return `${base}/f_auto,q_auto:best/v1762938909/${heroName.toLowerCase().replace('.','').replace(':','')}.png`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      
      {/* --- 1. SELECTION HEADER --- */}
      <div className="grid grid-cols-2 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 1</label>
          <select 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 outline-none transition-colors"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Player 2</label>
          <select 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 outline-none transition-colors"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            {players.map(p => <option key={p.slug} value={p.slug}>{p.data.name}</option>)}
          </select>
        </div>
      </div>

      {/* --- 2. THE VISUAL FACE-OFF --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 relative min-h-[500px]">
         
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center w-20 h-20 bg-neutral-950 border-4 border-amber-500 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.6)]">
            <span className="font-black italic text-amber-500 text-2xl tracking-tighter">VS</span>
         </div>

         {/* LEFT PLAYER */}
         <div className="group relative w-full h-[500px] bg-neutral-900 md:rounded-l-2xl overflow-hidden border border-neutral-800 md:border-r-0 shadow-2xl">
            {p1 ? (
              <>
                <div className="absolute inset-0 z-0">
                   <img src={p1.data.headshot || '/default-player.png'} alt={p1.data.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                   <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 mix-blend-color" style={{ backgroundColor: p1Color }}></div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-8 z-10 flex flex-col items-start">
                   <div className="flex items-center gap-3 mb-3">
                      {getTeamLogo(teams, p1.data.team) && <img src={getTeamLogo(teams, p1.data.team)!} className="w-10 h-10 object-contain drop-shadow-md" alt="Team" />}
                      <div className="h-6 w-px bg-white/20"></div>
                      {p1.data.flagUrl && <img src={p1.data.flagUrl} className="w-8 h-5 rounded shadow-sm opacity-90" alt="Country" />}
                   </div>
                   <h2 className="text-6xl lg:text-7xl font-title font-black italic text-white leading-none tracking-tighter mb-2 drop-shadow-2xl">{p1.data.name}</h2>
                   <span className="px-3 py-1 rounded-sm text-sm font-mono font-bold uppercase tracking-widest text-black" style={{ backgroundColor: p1Color }}>{p1.data.role}</span>
                </div>
              </>
            ) : <div className="w-full h-full flex items-center justify-center text-neutral-600 font-bold uppercase">Select Player 1</div>}
         </div>

         {/* RIGHT PLAYER */}
         <div className="group relative w-full h-[500px] bg-neutral-900 md:rounded-r-2xl overflow-hidden border border-neutral-800 md:border-l-0 shadow-2xl text-right">
            {p2 ? (
              <>
                <div className="absolute inset-0 z-0">
                   <img src={p2.data.headshot || '/default-player.png'} alt={p2.data.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                   <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 mix-blend-color" style={{ backgroundColor: p2Color }}></div>
                </div>
                <div className="absolute bottom-0 right-0 w-full p-8 z-10 flex flex-col items-end">
                   <div className="flex items-center gap-3 mb-3 flex-row-reverse">
                      {getTeamLogo(teams, p2.data.team) && <img src={getTeamLogo(teams, p2.data.team)!} className="w-10 h-10 object-contain drop-shadow-md" alt="Team" />}
                      <div className="h-6 w-px bg-white/20"></div>
                      {p2.data.flagUrl && <img src={p2.data.flagUrl} className="w-8 h-5 rounded shadow-sm opacity-90" alt="Country" />}
                   </div>
                   <h2 className="text-6xl lg:text-7xl font-title font-black italic text-white leading-none tracking-tighter mb-2 drop-shadow-2xl">{p2.data.name}</h2>
                   <span className="px-3 py-1 rounded-sm text-sm font-mono font-bold uppercase tracking-widest text-black" style={{ backgroundColor: p2Color }}>{p2.data.role}</span>
                </div>
              </>
            ) : <div className="w-full h-full flex items-center justify-center text-neutral-600 font-bold uppercase">Select Player 2</div>}
         </div>
      </div>

      {/* --- 3. COMPARISON DATA GRID --- */}
      {(p1 && p2) && (
        <div className="grid grid-cols-2 divide-x divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900">
           {[p1, p2].map((p, i) => {
              const { majorTeam, individual, minorTeam } = getAccolades(p.data.career);
              const years = getYearsActive(p.data.career);
              const heroBaseUrl = p.data.headshot || '';

              return (
                 <div key={i} className="p-8 space-y-8">
                    
                    {/* Career & Heroes */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                       <div className="bg-neutral-950/50 p-4 rounded-lg border border-neutral-800">
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1">Career Span</p>
                          <p className="text-lg text-white font-medium">{years}</p>
                       </div>
                       <div className="bg-neutral-950/50 p-4 rounded-lg border border-neutral-800">
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-2">Signatures</p>
                          <div className="flex gap-2">
                             {p.data.signatureHeroes?.map(hero => (
                                <img key={hero} src={getHeroIcon(hero)} className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 p-0.5" title={hero} />
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* 1. Major Titles */}
                    <div className={`p-6 rounded-xl border ${majorTeam.length > 0 ? 'bg-amber-950/20 border-amber-900/30' : 'bg-neutral-950 border-neutral-800'}`}>
                       <p className="text-xs text-amber-500 uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                          <span className="text-lg">🏆</span> Major Titles ({majorTeam.length})
                       </p>
                       {majorTeam.length > 0 ? (
                          <ul className="space-y-2">
                             {majorTeam.map((t, idx) => <li key={idx} className="text-white font-bold text-sm border-l-2 border-amber-500/50 pl-3">{t}</li>)}
                          </ul>
                       ) : <p className="text-neutral-600 italic text-sm">None</p>}
                    </div>

                    {/* 2. Individual Awards */}
                    <div className={`p-6 rounded-xl border ${individual.length > 0 ? 'bg-fuchsia-950/20 border-fuchsia-900/30' : 'bg-neutral-950 border-neutral-800'}`}>
                       <p className="text-xs text-fuchsia-400 uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                          <span className="text-lg">⭐</span> Awards ({individual.length})
                       </p>
                       {individual.length > 0 ? (
                          <ul className="space-y-2">
                             {individual.map((t, idx) => <li key={idx} className="text-white font-medium text-sm border-l-2 border-fuchsia-500/50 pl-3">{t}</li>)}
                          </ul>
                       ) : <p className="text-neutral-600 italic text-sm">None</p>}
                    </div>

                    {/* 3. Regional Wins (RESTORED) */}
                    <div className={`p-6 rounded-xl border ${minorTeam.length > 0 ? 'bg-slate-950/20 border-slate-800/50' : 'bg-neutral-950 border-neutral-800'}`}>
                       <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                          <span className="text-lg">🎖️</span> Regional Wins ({minorTeam.length})
                       </p>
                       {minorTeam.length > 0 ? (
                          <ul className="space-y-2">
                             {minorTeam.map((t, idx) => <li key={idx} className="text-slate-300 font-medium text-sm border-l-2 border-slate-600/50 pl-3">{t}</li>)}
                          </ul>
                       ) : <p className="text-neutral-600 italic text-sm">None</p>}
                    </div>

                 </div>
              );
           })}
        </div>
      )}
    </div>
  );
}