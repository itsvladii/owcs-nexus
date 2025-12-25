export const getRiskRating = (elo: number) => {
  // NEW BRACKETS BASED ON TOP ELO ~1660
  
  // 1. AAA (Prime): 1650+ 
  // Reserved for the absolute kings (Top 1-3 teams in the world)
  if (elo >= 1650) {
    return { 
        grade: 'AAA', 
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', 
        label: 'Prime Asset' 
    };
  }

  // 2. A (Strong): 1550 - 1649
  // Solid playoff teams. Very safe buys.
  if (elo >= 1550) {
    return { 
        grade: 'A', 
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', 
        label: 'Strong Buy' 
    };
  }

  // 3. B (Speculative): 1450 - 1549
  // The "Mid Table." They win some, they lose some.
  if (elo >= 1350) {
    return { 
        grade: 'B', 
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', 
        label: 'Speculative' 
    };
  }

  // 4. C (High Risk): < 1450
  // Bottom tier. High risk of losing value, but cheap to buy.
  return { 
      grade: 'C', 
      color: 'bg-red-500/20 text-red-400 border-red-500/50', 
      label: 'High Risk' 
  };
};