import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ... (Keep your interfaces: HistoryPoint, TeamData, MatchData, Props) ...
// ... (Keep your mergeHistory helper) ...

// Re-defining types for clarity in this snippet, but you can keep yours
interface HistoryPoint { date: string; elo: number; }
export interface TeamData { name: string; logo: string | null; rating: number; wins: number; losses: number; region: string; history: HistoryPoint[]; }
interface MatchData { date: string; tournament: string; winner?: string; match2opponents?: { name: string; score?: number; }[]; }
interface Props { teams: TeamData[]; matches: MatchData[]; }

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

  const headToHead = useMemo(() => {
    if (!teamA || !teamB) return [];
    return matches.filter(m => {
      if (!m.match2opponents || m.match2opponents.length < 2) return false;
      const name1 = m.match2opponents[0].name.toLowerCase();
      const name2 = m.match2opponents[1].name.toLowerCase();
      const targetA = teamA.name.toLowerCase();
      const targetB = teamB.name.toLowerCase();
      const isTeam = (matchName: string, target: string) => matchName.includes(target) || target.includes(matchName);
      const hasA = isTeam(name1, targetA) || isTeam(name2, targetA);
      const hasB = isTeam(name1, targetB) || isTeam(name2, targetB);
      return hasA && hasB; 
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [teamA, teamB, matches]);

  const record = useMemo(() => {
    let winsA = 0; let winsB = 0;
    headToHead.forEach(m => {
       const name1 = m.match2opponents![0].name.toLowerCase();
       const targetA = teamA?.name.toLowerCase() || '';
       const isAFirst = name1.includes(targetA) || targetA.includes(name1);
       if (isAFirst) { if (m.winner === "1") winsA++; else winsB++; } 
       else { if (m.winner === "2") winsA++; else winsB++; }
    });
    return { winsA, winsB };
  }, [headToHead, teamA]);

  if (!teamA || !teamB) return <div className="p-8 text-center text-neutral-500">Loading...</div>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 border-b border-neutral-800 bg-neutral-950">
        <div>
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Team 1</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-lg md:text-xl focus:border-amber-500 outline-none appearance-none"
            value={idA} onChange={(e) => setIdA(e.target.value)}
          >
            {sortedTeams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 uppercase font-bold mb-2">Team 2</label>
          <select 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white font-title text-lg md:text-xl focus:border-blue-500 outline-none appearance-none"
            value={idB} onChange={(e) => setIdB(e.target.value)}
          >
            {sortedTeams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* TALE OF THE TAPE (Responsive Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 border-b border-neutral-800 bg-neutral-900/50">
        
        {/* Team A */}
        <div className="p-4 md:p-6 text-center space-y-4 md:space-y-6 border-r border-neutral-800 md:border-r-0">
          <div className="h-16 md:h-24 flex items-center justify-center">
             {teamA.logo ? <img src={teamA.logo} className="h-12 w-12 md:h-20 md:w-20 object-contain" /> : <div className="text-xl font-bold">{teamA.name.substring(0,2)}</div>}
          </div>
          
          {/* Mobile-Only Labels (Shown inline) */}
          <div>
             <p className="text-[10px] text-neutral-500 uppercase font-bold md:hidden mb-1">Win Rate</p>
             <p className="text-xl md:text-2xl font-mono font-bold text-white">{Math.round((teamA.wins / (teamA.wins + teamA.losses)) * 100)}%</p>
          </div>
          <div>
             <p className="text-[10px] text-neutral-500 uppercase font-bold md:hidden mb-1">Rating</p>
             <p className="text-xl md:text-2xl font-mono font-bold text-amber-500">{Math.round(teamA.rating)}</p>
          </div>
        </div>

        {/* Middle Labels (Desktop Only) */}
        <div className="hidden md:flex p-6 flex-col justify-center items-center space-y-16 opacity-30 border-l border-r border-neutral-800">
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Identity</span>
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Performance</span>
           <span className="text-sm font-bold uppercase tracking-[0.2em]">Rating</span>
        </div>

        {/* Team B */}
        <div className="p-4 md:p-6 text-center space-y-4 md:space-y-6">
          <div className="h-16 md:h-24 flex items-center justify-center">
             {teamB.logo ? <img src={teamB.logo} className="h-12 w-12 md:h-20 md:w-20 object-contain" /> : <div className="text-xl font-bold">{teamB.name.substring(0,2)}</div>}
          </div>
          <div>
             <p className="text-[10px] text-neutral-500 uppercase font-bold md:hidden mb-1">Win Rate</p>
             <p className="text-xl md:text-2xl font-mono font-bold text-white">{Math.round((teamB.wins / (teamB.wins + teamB.losses)) * 100)}%</p>
          </div>
          <div>
             <p className="text-[10px] text-neutral-500 uppercase font-bold md:hidden mb-1">Rating</p>
             <p className="text-xl md:text-2xl font-mono font-bold text-blue-400">{Math.round(teamB.rating)}</p>
          </div>
        </div>
      </div>

      {/* ELO CHART */}
      <div className="p-4 md:p-6 h-64 md:h-96 bg-neutral-900 border-b border-neutral-800 relative">
        <div className="absolute top-4 left-0 right-0 text-center">
           <h3 className="text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-widest">Season Trajectory</h3>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey="date" stroke="#525252" tick={{fontSize: 10}} minTickGap={30} />
            <YAxis domain={['auto', 'auto']} hide={true} />
            <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', color: '#fff' }} itemStyle={{ fontSize: '12px' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Line type="monotone" dataKey="teamA" name={teamA.name} stroke="#f59e0b" strokeWidth={3} dot={false} connectNulls />
            <Line type="monotone" dataKey="teamB" name={teamB.name} stroke="#60a5fa" strokeWidth={3} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* HEAD-TO-HEAD HISTORY (Responsive) */}
      <div className="p-4 md:p-8 bg-neutral-950/50">
         <h3 className="text-center text-xs md:text-sm font-bold text-neutral-500 uppercase mb-6 md:mb-8 flex items-center justify-center gap-2">
            Head-to-Head
            <span className="bg-neutral-800 text-white px-2 py-0.5 rounded text-[10px] md:text-xs">{headToHead.length} Gms</span>
         </h3>
         
         {/* Scoreboard */}
         <div className="flex items-center justify-center gap-6 md:gap-12 mb-8 md:mb-10">
            <div className="text-center">
               <div className="text-4xl md:text-6xl font-title text-amber-500">{record.winsA}</div>
            </div>
            <div className="text-neutral-700 font-black text-2xl md:text-4xl opacity-20">VS</div>
            <div className="text-center">
               <div className="text-4xl md:text-6xl font-title text-blue-500">{record.winsB}</div>
            </div>
         </div>

         {/* Match List (Responsive Rows) */}
         <div className="space-y-3 max-w-3xl mx-auto">
            {headToHead.map(match => {
               const name1 = match.match2opponents![0].name;
               const name2 = match.match2opponents![1].name;
               const score1 = match.match2opponents![0].score ?? 0;
               const score2 = match.match2opponents![1].score ?? 0;
               const targetA = teamA.name.toLowerCase();
               const n1 = name1.toLowerCase();
               const isAFirst = n1.includes(targetA) || targetA.includes(n1);
               const nameLeft = isAFirst ? name1 : name2;
               const nameRight = isAFirst ? name2 : name1;
               const scoreLeft = isAFirst ? score1 : score2;
               const scoreRight = isAFirst ? score2 : score1;
               const winnerId = match.winner;
               const didAWin = (isAFirst && winnerId === "1") || (!isAFirst && winnerId === "2");

               return (
                 <div key={match.date + match.tournament} className="flex flex-col md:flex-row items-center justify-between p-3 md:p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                    
                    {/* Date (Top on mobile, Left on desktop) */}
                    <div className="w-full md:w-32 text-center md:text-left mb-2 md:mb-0 border-b md:border-b-0 border-neutral-800 pb-2 md:pb-0">
                        <p className="text-xs font-bold text-white">{new Date(match.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-neutral-500 uppercase truncate">{match.tournament}</p>
                    </div>
                    
                    {/* Matchup Row */}
                    <div className="flex items-center justify-between w-full md:flex-1">
                        {/* Left Team */}
                        <div className={`flex-1 flex justify-end gap-2 font-bold text-sm ${didAWin ? "text-amber-500" : "text-neutral-500"} text-right truncate`}>
                           {nameLeft}
                        </div>

                        {/* Score */}
                        <div className="px-3 md:px-6 font-mono font-bold text-white text-base md:text-lg bg-neutral-950 rounded py-1 mx-2 md:mx-4 border border-neutral-800">
                           {scoreLeft}-{scoreRight}
                        </div>

                        {/* Right Team */}
                        <div className={`flex-1 flex justify-start gap-2 font-bold text-sm ${!didAWin ? "text-blue-500" : "text-neutral-500"} text-left truncate`}>
                           {nameRight}
                        </div>
                    </div>
                 </div>
               );
            })}
            
            {headToHead.length === 0 && (
               <div className="text-center py-6 border border-dashed border-neutral-800 rounded-xl">
                   <p className="text-sm text-neutral-500 italic">No matches found in 2025.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}