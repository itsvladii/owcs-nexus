// src/components/FilteredPlayerList.tsx
import React, { useState, useMemo } from 'react';

// --- DATA TYPES (Unchanged) ---
interface Player {
  slug: string;
  data: {
    name: string;
    role: string;
    team: string;
    headshot?: string;
  };
}
interface Team {
  slug: string;
  data: {
    name: string;
  };
}
interface Props {
  players: Player[];
  teams: Team[];
}

export default function FilteredPlayerList({ players, teams }: Props) {
  // --- STATE AND FILTER LOGIC (Unchanged) ---
  const [roleFilter, setRoleFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [nameFilter, setNameFilter] = useState('');

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      if (roleFilter !== 'All' && player.data.role !== roleFilter) {
        return false;
      }
      if (teamFilter !== 'All' && player.data.team !== teamFilter) {
        return false;
      }
      if (nameFilter !== '' && !player.data.name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [roleFilter, teamFilter, nameFilter, players]);

  // --- RENDER FUNCTION (This is where the changes are) ---
  return (
    <div>
      {/* --- FILTER CONTROLS (Unchanged) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-neutral-900 rounded-lg border border-neutral-800">
        <div>
          <label htmlFor="name-filter" className="block text-sm font-medium text-neutral-300 mb-1">
            Search by Name
          </label>
          <input 
            type="text" 
            id="name-filter"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
            placeholder="e.g., Proper"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-neutral-300 mb-1">
            Filter by Role
          </label>
          <select 
            id="role-filter"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>All</option>
            <option>Tank</option>
            <option>Damage</option>
            <option>Support</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-filter" className="block text-sm font-medium text-neutral-300 mb-1">
            Filter by Team
          </label>
          <select 
            id="team-filter"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="All">All Teams</option>
            {teams.map(team => (
              <option key={team.slug} value={team.slug}>
                {team.data.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==============================================
      NEW "PLAYER GRID" SECTION
      ==============================================
      */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPlayers.map(player => {
            
            // 1. Build the headshot URL
            const headshotUrl = player.data.headshot
              ? player.data.headshot.replace('/upload/', '/upload/w_600,c_fit,b_transparent,f_auto,q_auto:best/')
              : null;

            return (
              <a 
                key={player.slug}
                href={`/players/${player.slug}/`} 
                className="
                  relative block h-80 w-full
                  bg-neutral-900 rounded-lg 
                  border border-neutral-800 
                  transition-all duration-300 
                  hover:border-amber-500/50 hover:scale-[1.02]
                  shadow-lg overflow-hidden group
                "
              >
                {/* 2. The Angled Frame */}
                <div className="
                  absolute inset-0 h-full w-full 
                  overflow-hidden -skew-y-3 
                  bg-neutral-800/50
                  shadow-[0_0_0_1px_rgba(245,158,11,0.2)]
                ">
                  {headshotUrl ? (
                    <img 
                      src={headshotUrl}
                      alt={player.data.name}
                      className="
                        relative w-full h-full 
                        object-contain object-top
                        skew-y-3
                        transition-transform duration-300
                        group-hover:scale-105
                      "
                      width={600}
                      height={600}
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full skew-y-3"></div>
                  )}
                </div>
                
                {/* 3. Dark Gradient Overlay */}
                <div className="
                  absolute bottom-0 left-0 right-0 h-1/2 
                  bg-gradient-to-t from-black/90 via-black/70 to-transparent
                "></div>

                {/* 4. Player Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-3xl font-bold text-white font-title">{player.data.name}</h3>
                  <p className="text-xl text-yellow-400">{player.data.role}</p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-neutral-900 rounded-lg border border-neutral-800">
          <h2 className="text-2xl font-bold text-white">No players found</h2>
          <p className="text-neutral-400">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}