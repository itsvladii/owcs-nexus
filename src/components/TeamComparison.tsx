import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// --- TYPES ---
interface HistoryPoint {
  date: string;
  elo: number;
}

export interface TeamData {
  name: string;
  logo: string | null;
  rating: number;
  wins: number;
  losses: number;
  region: string;
  history: HistoryPoint[];
}

interface MatchData {
  date: string;
  tournament: string;
  winner?: string;
  match2opponents?: {
    name: string;
    score?: number;
  }[];
}

interface Props {
  teams: TeamData[];
  matches: MatchData[];
}

// --- HELPERS ---

function mergeHistory(historyA: HistoryPoint[], historyB: HistoryPoint[]) {
  const dataMap = new Map();

  historyA.forEach(h => {
    const dateKey = new Date(h.date).getTime();
    const displayDate = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dataMap.set(dateKey, { timestamp: dateKey, date: displayDate, teamA: Math.round(h.elo) });
  });

  historyB.forEach(h => {
    const dateKey = new Date(h.date).getTime();
    const displayDate = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = dataMap.get(dateKey) || { timestamp: dateKey, date: displayDate };
    existing.teamB = Math.round(h.elo);
    dataMap.set(dateKey, existing);
  });

  return Array.from(dataMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
}

export default function TeamComparison({ teams, matches }: Props) {
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const [idA, setIdA] = useState(sortedTeams[0]?.name);
  const [idB, setIdB] = useState(sortedTeams[1]?.name);

  const teamA = teams.find(t => t.name === idA);
  const teamB = teams.find(t => t.name === idB);

  const chartData = useMemo(() => {
    if (!teamA || !teamB) return [];
    return mergeHistory(teamA.history, teamB.history);
  }, [teamA, teamB]);

  // --- FIXED HEAD-TO-HEAD LOGIC ---
  const headToHead = useMemo(() => {
    if (!teamA || !teamB) return [];
    
    return matches.filter(m => {
      if (!m.match2opponents || m.match2opponents.length < 2) return false;
      
      const name1 = m.match2opponents[0].name.toLowerCase();
      const name2 = m.match2opponents[1].name.toLowerCase();
      const targetA = teamA.name.toLowerCase();
      const targetB = teamB.name.toLowerCase();

      // Helper: Does this match name correspond to this target team?
      const isTeam = (matchName: string, target: string) => 
        matchName.includes(target) || target.includes(matchName);

      // Check if Team A is present (in either slot)
      const hasA = isTeam(name1, targetA) || isTeam(name2, targetA);
      
      // Check if Team B is present (in either slot)
      const hasB = isTeam(name1, targetB) || isTeam(name2, targetB);

      // Only keep match if BOTH are present
      return hasA && hasB; 
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [teamA, teamB, matches]);

  const record = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    
    headToHead.forEach(m => {
       // We must identify which slot (0 or 1) corresponds to Team A for this specific match
       const name1 = m.match2opponents![0].name.toLowerCase();
       const targetA = teamA?.name.toLowerCase() || '';
       
       // If Team A is in slot 0...
       const isAFirst = name1.includes(targetA) || targetA.includes(name1);
       
       // Winner "1" means slot 0 won. Winner "2" means slot 1 won.
       if (isAFirst) {
         if (m.winner === "1") winsA++;
         else winsB++;
       } else {
         // Team A is in slot 1
         if (m.winner === "2") winsA++;
         else winsB++;
       }
    });
    
    return { winsA, winsB };
  }, [headToHead, teamA]);

  if (!teamA || !teamB) return <div className="p-8 text-center text-neutral-500">Loading data...</div>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* CONTROLS */}
      <div className="grid grid-cols-2 gap-4 p-6 border-b border-neutral-800 bg-neutral-950">
        <div>
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Team 1</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-amber-500 outline-none appearance-none cursor-pointer hover:bg-neutral-700 transition-colors"
            value={idA}
            onChange={(e) => setIdA(e.target.value)}
          >
            {sortedTeams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Team 2</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-xl focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-neutral-700 transition-colors"
            value={idB}
            onChange={(e) => setIdB(e.target.value)}
          >
            {sortedTeams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* TALE OF THE TAPE */}
      <div className="grid grid-cols-3 divide-x divide-neutral-800 border-b border-neutral-800 bg-neutral-900/50">
        
        {/* Team A */}
        <div className="p-6 text-center space-y-6">
          <div className="h-24 flex items-center justify-center">
             {teamA.logo ? (
               <img src={teamA.logo} className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
             ) : <div className="text-2xl font-bold">{teamA.name.substring(0,2)}</div>}
          </div>
          <div>
             <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Win Rate</p>
             <p className="text-2xl font-mono font-bold text-white">{Math.round((teamA.wins / (teamA.wins + teamA.losses)) * 100)}%</p>
          </div>
          <div>
             <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Current ELO</p>
             <p className="text-2xl font-mono font-bold text-amber-500">{Math.round(teamA.rating)}</p>
          </div>
        </div>

        {/* Middle Labels */}
        <div className="p-6 flex flex-col justify-center items-center space-y-16 opacity-30">
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Identity</span>
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Performance</span>
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Rating</span>
        </div>

        {/* Team B */}
        <div className="p-6 text-center space-y-6">
          <div className="h-24 flex items-center justify-center">
             {teamB.logo ? (
               <img src={teamB.logo} className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
             ) : <div className="text-2xl font-bold">{teamB.name.substring(0,2)}</div>}
          </div>
          <div>
             <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Win Rate</p>
             <p className="text-2xl font-mono font-bold text-white">{Math.round((teamB.wins / (teamB.wins + teamB.losses)) * 100)}%</p>
          </div>
          <div>
             <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Current ELO</p>
             <p className="text-2xl font-mono font-bold text-blue-400">{Math.round(teamB.rating)}</p>
          </div>
        </div>
      </div>

      {/* ELO CHART */}
      <div className="p-6 h-96 bg-neutral-900 border-b border-neutral-800 relative">
        <div className="absolute top-6 left-0 right-0 text-center">
           <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Season Trajectory</h3>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 40, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey="date" stroke="#525252" tick={{fontSize: 10}} minTickGap={40} />
            <YAxis domain={['auto', 'auto']} hide={true} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', color: '#fff' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            <Line 
              type="monotone" 
              dataKey="teamA" 
              name={teamA.name} 
              stroke="#f59e0b" 
              strokeWidth={3} 
              dot={false} 
              connectNulls 
            />
            <Line 
              type="monotone" 
              dataKey="teamB" 
              name={teamB.name} 
              stroke="#60a5fa" 
              strokeWidth={3} 
              dot={false} 
              connectNulls 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* HEAD-TO-HEAD HISTORY */}
      <div className="p-8 bg-neutral-950/50">
         <h3 className="text-center text-sm font-bold text-neutral-500 uppercase mb-8 flex items-center justify-center gap-3">
            Head-to-Head Record
            <span className="bg-neutral-800 text-white px-2 py-0.5 rounded text-xs">{headToHead.length} Matches</span>
         </h3>
         
         {/* Scoreboard */}
         <div className="flex items-center justify-center gap-12 mb-10">
            <div className="text-center">
               <div className="text-6xl font-title text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">{record.winsA}</div>
               <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2">{teamA.name} Wins</div>
            </div>
            <div className="text-neutral-700 font-black text-4xl opacity-20">VS</div>
            <div className="text-center">
               <div className="text-6xl font-title text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]">{record.winsB}</div>
               <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2">{teamB.name} Wins</div>
            </div>
         </div>

         {/* Match List */}
         <div className="space-y-3 max-w-3xl mx-auto">
            {headToHead.map(match => {
               // 1. Identify the raw data
               const rawName1 = match.match2opponents![0].name;
               const rawName2 = match.match2opponents![1].name;
               const score1 = match.match2opponents![0].score ?? 0;
               const score2 = match.match2opponents![1].score ?? 0;
               
               // 2. Determine who is who (Robust Check)
               // We check both directions to handle "Falcons" vs "Team Falcons"
               const targetA = teamA.name.toLowerCase();
               const n1 = rawName1.toLowerCase();
               
               // Is the first team in the API data "Team A"?
               const isAFirst = n1.includes(targetA) || targetA.includes(n1);
               
               // 3. Normalize for Display (Team A always Left)
               const nameLeft = isAFirst ? rawName1 : rawName2;
               const nameRight = isAFirst ? rawName2 : rawName1;
               const scoreLeft = isAFirst ? score1 : score2;
               const scoreRight = isAFirst ? score2 : score1;
               
               // 4. Determine Winner
               // If A is First, and Winner is "1", then A won.
               // If A is Second, and Winner is "2", then A won.
               const winnerId = match.winner; // "1" or "2"
               const didAWin = (isAFirst && winnerId === "1") || (!isAFirst && winnerId === "2");

               return (
                 <div key={match.date + match.tournament} className="flex items-center justify-between p-4 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors">
                    
                    {/* Date & Event */}
                    <div className="w-32">
                        <p className="text-xs font-bold text-white">{new Date(match.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-neutral-500 uppercase truncate">{match.tournament}</p>
                    </div>
                    
                    {/* LEFT SIDE (Always Team A - Amber) */}
                    <div className={`flex-1 flex justify-end gap-3 font-bold text-sm md:text-base ${didAWin ? "text-amber-500" : "text-neutral-500"}`}>
                       {nameLeft}
                       {didAWin && <span className="text-xs mt-1">👑</span>}
                    </div>

                    {/* Score (Always A - B) */}
                    <div className="px-6 font-mono font-bold text-white text-lg bg-neutral-950 rounded py-1 mx-4 border border-neutral-800">
                       {scoreLeft} - {scoreRight}
                    </div>

                    {/* RIGHT SIDE (Always Team B - Blue) */}
                    <div className={`flex-1 flex justify-start gap-3 font-bold text-sm md:text-base ${!didAWin ? "text-blue-500" : "text-neutral-500"}`}>
                       {nameRight}
                       {!didAWin && <span className="text-xs mt-1">👑</span>}
                    </div>
                 </div>
               );
            })}
            
            {headToHead.length === 0 && (
               <div className="text-center py-8 border border-dashed border-neutral-800 rounded-xl">
                   <p className="text-neutral-500 italic">No recorded matches found between these teams in 2025.</p>
               </div>
            )}
         </div>
      </div>

    </div>
  );
}