// src/components/FilteredPlayerList.tsx
import React, { useState, useMemo } from 'react';

// Define the shape of our data
// (We get this from Astro)
interface Player {
  slug: string;
  data: {
    name: string;
    role: string;
    team: string; // This is the team's slug (e.g., 'team-falcons')
    headshot?: string;
  };
}
interface Team {
  slug: string;
  data: {
    name: string;
  };
}

// Define the props our component will receive
interface Props {
  players: Player[];
  teams: Team[];
}

export default function FilteredPlayerList({ players, teams }: Props) {
  // 1. Set up state for our filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [nameFilter, setNameFilter] = useState('');

  // 2. Create the list of filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Check Role Filter
      if (roleFilter !== 'All' && player.data.role !== roleFilter) {
        return false;
      }
      
      // Check Team Filter
      if (teamFilter !== 'All' && player.data.team !== teamFilter) {
        return false;
      }

      // Check Name Filter
      if (nameFilter !== '' && !player.data.name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }

      return true; // If all checks pass, include the player
    });
  }, [roleFilter, teamFilter, nameFilter, players]);

  // 3. Render the UI
  return (
    <div>
      {/* --- FILTER CONTROLS --- */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-neutral-900 rounded-lg border border-neutral-800">
        
        {/* Name Search */}
        <div>
          <label for="name-filter" class="block text-sm font-medium text-neutral-300 mb-1">
            Search by Name
          </label>
          <input 
            type="text" 
            id="name-filter"
            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
            placeholder="e.g., Proper"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <div>
          <label for="role-filter" class="block text-sm font-medium text-neutral-300 mb-1">
            Filter by Role
          </label>
          <select 
            id="role-filter"
            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>All</option>
            <option>Tank</option>
            <option>Flex DPS</option>
            <option>Hitscan DPS</option>
            <option>Flex Support</option>
            <option>Main Support</option>
          </select>
        </div>

        {/* Team Filter */}
        <div>
          <label for="team-filter" class="block text-sm font-medium text-neutral-300 mb-1">
            Filter by Team
          </label>
          <select 
            id="team-filter"
            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
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

      {/* --- PLAYER GRID --- */}
      {filteredPlayers.length > 0 ? (
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map(player => (
            <a 
              key={player.slug}
              href={`/players/${player.slug}/`} 
              class="bg-neutral-900 rounded-lg p-4 border border-neutral-800 text-center transition-all hover:border-amber-500/50 hover:scale-[1.02]"
            >
              {/* We'll add the Cloudinary logic back later, this is just a quick example */}
              {player.data.headshot && (
                <img 
                  src={player.data.headshot} 
                  alt=""
                  class="w-24 h-24 rounded-full mx-auto mb-3 border-2 border-neutral-700"
                  loading="lazy"
                />
              )}
              <h2 class="text-2xl font-bold text-white">{player.data.name}</h2>
              <p class="text-lg text-yellow-400">{player.data.role}</p>
            </a>
          ))}
        </div>
      ) : (
        <div class="text-center p-12 bg-neutral-900 rounded-lg border border-neutral-800">
          <h2 class="text-2xl font-bold text-white">No players found</h2>
          <p class="text-neutral-400">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}