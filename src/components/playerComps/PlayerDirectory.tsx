import React, { useState, useMemo } from 'react';

// --- TYPES ---
interface Player {
  slug: string;
  data: {
    name: string;
    role: string;
    team: string; // Team Name
    headshot?: string;
    country?: string;
    flagUrl?: string;
  };
}

interface Team {
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

export default function PlayerDirectory({ players, teams }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // --- HELPERS ---
  const getTeam = (teamName: string) => teams.find(t => t.data.name === teamName);
  
  // Filter Logic
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.data.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.data.team.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'All' || p.data.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [search, roleFilter, players]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      
      {/* --- CONTROLS HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
         <div>
            <h1 className="font-title text-6xl text-white italic font-black tracking-tighter mb-2">
              PLAYER DATABASE
            </h1>
            <p className="text-neutral-400 max-w-xl">
               Look through all the featured OWCS Players and filter them based on their roles.
            </p>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* SEARCH */}
            <div className="relative group">
               <input 
                 type="text" 
                 placeholder="Search Player..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-lg focus:border-amber-500 focus:outline-none transition-colors uppercase font-bold tracking-wider placeholder:text-neutral-600"
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </div>
            </div>

            {/* ROLE FILTER */}
            <select 
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value)}
               className="bg-neutral-900 border border-neutral-800 text-white px-6 py-3 rounded-lg focus:border-amber-500 focus:outline-none uppercase font-bold tracking-wider appearance-none cursor-pointer hover:bg-neutral-800 transition-colors"
            >
               <option value="All">All Roles</option>
               <option value="Tank">Tank</option>
               <option value="Flex DPS">Flex DPS</option>
               <option value="Hitscan DPS">Hitscan DPS</option>
               <option value="Flex Support">Flex Support</option>
               <option value="Main Support">Main Support</option>
            </select>
         </div>
      </div>

      {/* --- THE GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredPlayers.map((player) => {
          const team = getTeam(player.data.team);
          const teamColor = team?.data.colour || '#f59e0b'; // Default Amber
          const playerImage = player.data.headshot || '/default-player.png';

          return (
            <a 
              key={player.slug}
              href={`/players/${player.slug}`} 
              className="group relative h-[400px] w-full bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-all shadow-xl"
            >
              {/* 1. BACKGROUND IMAGE */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={playerImage} 
                  alt={player.data.name} 
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>
                
                {/* Team Color Tint on Hover */}
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 mix-blend-color"
                    style={{ backgroundColor: teamColor }}
                ></div>
              </div>

              {/* 2. INFO OVERLAY */}
              <div className="absolute bottom-0 left-0 w-full p-6 z-10 flex flex-col items-start translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                
                {/* Team Logo Badge */}
                {team?.data.logo && (
                   <div className="mb-3 w-10 h-10 bg-neutral-950/80 backdrop-blur rounded p-1.5 border border-white/10 shadow-lg group-hover:scale-110 transition-transform origin-bottom-left">
                      <img src={team.data.logo} className="w-full h-full object-contain" alt={team.data.name} />
                   </div>
                )}

                {/* Name */}
                <h3 className="text-5xl font-title font-black italic text-white leading-none tracking-tighter mb-2 drop-shadow-xl">
                  {player.data.name}
                </h3>
                
                {/* Role Pill */}
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }}></span>
                   <span 
                      className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-300"
                   >
                     {player.data.role}
                   </span>
                </div>
              </div>

              {/* 3. HOVER ARROW */}
              <div 
                 className="absolute top-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0"
                 style={{ color: teamColor }}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </div>

            </a>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlayers.length === 0 && (
         <div className="w-full py-24 text-center border border-dashed border-neutral-800 rounded-2xl">
            <p className="text-neutral-500 font-mono text-lg">No player found matching criteria.</p>
         </div>
      )}

    </div>
  );
}