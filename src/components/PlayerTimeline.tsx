import React, { useState } from 'react';

// --- TYPES ---
interface CareerEntry {
  date: string;
  team: string;
  notes?: string[];
}

interface TeamData {
  slug: string;
  data: {
    name: string;
    logo?: string;
    colour?: string;
  };
}

interface Props {
  career: CareerEntry[];
  teams: TeamData[];
}

// --- HELPERS ---

const MAJOR_KEYWORDS = ["World Finals", "Grand Finals", "Midseason", "Major", "Esports World Cup", "Overwatch League","World Cup"];
const MINOR_KEYWORDS=["Contenders","Stage","Soop","Cup","Saudi"]
const INDIVIDUAL_KEYWORDS = ["MVP", "Role Star", "Dennis Hawelka", "Alarm Rookie", "Player of the Match"];

// Helper to categorize notes
const categorizeNotes = (notes: string[] = []) => {
    const major = [] as string[];
    const individual = [] as string[];
    const minor = [] as string[];
    const misc=[] as string[]

    notes.forEach(note => {
        const lower = note.toLowerCase();
        const cleanText = note.replace('🏆', '').replace(/^ Won /, '').trim();
        
        // 1. MAJOR TITLES
        if (lower.includes('won ') && MAJOR_KEYWORDS.some(k => note.includes(k))) {
            major.push(cleanText);
        }
        // 2. MINOR / OTHER
        else if ((lower.includes('won ') && MINOR_KEYWORDS.some(k => note.includes(k)))){
            minor.push(cleanText);
        }
        else if(lower.includes('nd ') && note.match(/[🥈🥉]/))
        {
            misc.push(cleanText);
        }
        // 3. INDIVIDUAL AWARDS
        else if (INDIVIDUAL_KEYWORDS.some(k => note.includes(k)) || note.match(/[⭐🌏🚀🎯🛡️💊]/)) {
            individual.push(cleanText);
        }
        
        // 3. MINOR / OTHER
        
    });

    return { major, individual, minor,misc };
};

const getDuration = (startDateStr: string, endDateStr: string = new Date().toISOString()) => {
    // 1. Parse Dates
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    // 2. SAFETY CHECK: If date is invalid (NaN), return placeholder
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ""; 
    }

    // 3. Calculate total months difference
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();

    // 4. Handle logic for "Year Only" data
    // If you only put "2020", JS defaults to Jan 1st. 
    // So "2020" to "2021" is exactly 12 months.
    
    // Prevent negative duration
    if (months < 0) months = 0;
    
    // If less than a month (e.g. same date), show nothing or <1m
    if (months < 1) return ""; 

    const y = Math.floor(months / 12);
    const m = months % 12;

    // 5. FORMATTING
    // If we have exact years (m == 0), don't show "0m"
    if (m === 0) {
        return y > 0 ? `${y}y` : ""; 
    }
    
    // Standard format
    if (y > 0) return `${y}y ${m}m`;
    return `${m}m`;
};

export default function ServiceLogInteractive({ career, teams }: Props) {
    if (!career || career.length === 0) {
    return (
        <div className="p-4 border border-dashed border-neutral-800 rounded-xl text-neutral-600 font-mono text-xs text-center">
            NO SERVICE RECORD FOUND
        </div>
    );
  }
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleRow = (index: number) => {
    const next = new Set(openRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpenRows(next);
  };

  // --- DATA PROCESSING ---
  const sortedCareer = [...career].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const history = sortedCareer.map((entry, index) => {
      const previousEntry = sortedCareer[index - 1]; 
      const endDate = previousEntry ? previousEntry.date : new Date().toISOString();
      
      const teamDetails = teams.find(t => 
        t.data.name.toLowerCase() === entry.team.toLowerCase() || 
        t.slug === entry.team.toLowerCase()
      );

      const hasAccolades = entry.notes && entry.notes.length > 0;
      const isMajorWinner = entry.notes?.some(n => 
          (n.includes('🏆') || n.toLowerCase().includes('won ')) && 
          MAJOR_KEYWORDS.some(k => n.includes(k))
      );
      const isDebut = index === sortedCareer.length - 1;

      // Pre-calculate categories for rendering
      const categories = categorizeNotes(entry.notes);

      return {
          ...entry,
          duration: getDuration(entry.date, endDate),
          isDebut,
          teamDetails: {
              name: teamDetails?.data.name || entry.team,
              logo: teamDetails?.data.logo || null,
              color: teamDetails?.data.colour || '#525252'
          },
          hasAccolades,
          isMajorWinner,
          categories // Pass the categorized lists
      };
  });

  const visibleHistory = showAll ? history : history.slice(0, 6);

  return (
    <div className="w-full border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/50 backdrop-blur-sm">
      
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-black/20">
         <h3 className="font-title text-xl text-white italic font-bold tracking-tight">
            SERVICE RECORD
         </h3>
         <span className="text-xs font-mono text-neutral-500">
            {history.length} ENTRIES
         </span>
      </div>

      {/* LIST */}
      <div className="divide-y divide-neutral-800">
        {visibleHistory.map((item, index) => {
           const isOpen = openRows.has(index);
           const { teamDetails, isMajorWinner, hasAccolades, isDebut, categories } = item;
           
           // Styling Logic
           const borderClass = isMajorWinner 
                ? 'bg-amber-500' 
                : (isDebut ? 'bg-blue-500' : 'bg-transparent group-hover:bg-neutral-700');
           
           const bgClass = isDebut && !isMajorWinner 
                ? 'bg-blue-500/5 hover:bg-blue-500/10' 
                : '';

           return (
             <div key={index} className="group">
                
                {/* --- MAIN ROW --- */}
                <div 
                    onClick={() => hasAccolades && toggleRow(index)}
                    className={`
                        relative px-4 sm:px-6 py-4 flex items-center justify-between transition-colors
                        ${hasAccolades ? 'cursor-pointer hover:bg-neutral-800/50' : ''}
                        ${isOpen ? 'bg-neutral-800/50' : ''}
                        ${bgClass}
                    `}
                >
                    {/* Left Border Highlight */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${borderClass}`}></div>

                    {/* LEFT SIDE: Date, Logo, Name */}
                    {/* flex-1 and overflow-hidden ensures truncation works */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-hidden">
                        
                        {/* 1. Date & Duration (Fixed Width) */}
                        <div className="w-16 sm:w-24 shrink-0">
                            <div className={`text-xs sm:text-sm font-mono font-bold ${isDebut && !isMajorWinner ? 'text-blue-200' : 'text-white'}`}>
                                {item.date.split('-')[0]}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase font-mono mt-0.5">
                                {item.duration}
                            </div>
                        </div>

                        {/* 2. Team Logo (Fixed Width) */}
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg p-1.5 flex items-center justify-center shrink-0 border ${isDebut && !isMajorWinner ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/30 border-white/5'}`}>
                            {teamDetails.logo ? (
                                <img src={teamDetails.logo} className="w-full h-full object-contain" alt="" />
                            ) : (
                                <span className="text-xs font-bold text-neutral-600">{teamDetails.name[0]}</span>
                            )}
                        </div>

                        {/* 3. Team Name (Flexible Width + Truncation) */}
                        <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm sm:text-base font-bold truncate ${isMajorWinner ? 'text-amber-200' : (isDebut ? 'text-blue-100' : 'text-neutral-200')}`}>
                                    {teamDetails.name}
                                </span>
                                {isDebut && (
                                    <span className="shrink-0 text-[8px] sm:text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        Origin
                                    </span>
                                )}
                            </div>
                            {/* Mobile-Only Winner Text */}
                            {isMajorWinner && (
                                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider sm:hidden truncate">
                                    Title Winner
                                </span>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: Badges & Chevron */}
                    {/* shrink-0 ensures this doesn't get squashed */}
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
                        {isMajorWinner && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-500 text-xs">🏆</span>
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Champion</span>
                            </div>
                        )}
                        {hasAccolades && (
                            <div className={`text-neutral-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- ACCORDION CONTENT --- */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-black/20 border-t border-dashed border-neutral-800 ${isOpen ? 'max-h-[600px] opacity-100 py-6' : 'max-h-0 opacity-0 py-0'}`}>
                    <div className="px-6 pl-20 sm:pl-32 pr-6 grid gap-6">
                        
                        {/* 1. MAJOR TITLES (Gold) */}
                        {categories.major.length > 0 && (
                            <div>
                                <h4 className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-amber-500 rounded-full"></span> Majors
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.major.map((note, i) => (
                                        <span key={i} className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                            🏆 {note}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. REGIONAL / MINOR TITLES (Slate Blue) */}
                        {categories.minor.length > 0 && (
                            <div>
                                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span> Regional/Minor Titles
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.minor.map((note, i) => (
                                        <span key={i} className="text-xs font-medium px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                                            {note}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. INDIVIDUAL AWARDS (Fuchsia) */}
                        {categories.individual.length > 0 && (
                            <div>
                                <h4 className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-fuchsia-400 rounded-full"></span> Personal Achievements
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.individual.map((note, i) => (
                                        <span key={i} className="text-xs font-medium px-2.5 py-1 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200">
                                            {note}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. SERVICE NOTES (Gray) */}
                        {categories.misc.length > 0 && (
                            <div>
                                <h4 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-neutral-600 rounded-full"></span> Honorable Mentions
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.misc.map((note, i) => (
                                        <span key={i} className="text-xs px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
                                            {note}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

             </div>
           );
        })}
      </div>

      {/* FOOTER */}
      {history.length > 6 && (
        <button 
            onClick={() => setShowAll(!showAll)}
            className="w-full py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors border-t border-neutral-800"
        >
            {showAll ? 'Show Less' : `View ${history.length - 6} Older Entries`}
        </button>
      )}
    </div>
  );
}
