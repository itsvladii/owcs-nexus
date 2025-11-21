// scripts/debug-team-names.js
import fetch from 'node-fetch'; // You might need to run: npm install node-fetch

const API_KEY = "UizSmWJ2EMH4Q4BH42ljOZSKXCPl72sQePu8ASGmAD7pdh5J2L8hEpNmUzZyqRp6soANkbJ6Z1RXEbqCausBATJzsmzBoqXRDcVv1aFCzBMab2hE7kfIfXGWWtUXRUjS"; 
const USER_AGENT = "OWCS-Debug/1.0";

async function findTeamNames() {
  console.log("🕵️‍♀️ Searching for team names in recent S-Tier matches...");
  
  const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
  endpoint.searchParams.set('wiki', 'overwatch');
  endpoint.searchParams.set('limit', '100'); // Check last 100 matches
  endpoint.searchParams.set('order', 'date DESC');
  // Only S-Tier (World Finals, Midseason) where Falcons/CR play
  endpoint.searchParams.set('conditions', '[[finished::1]] AND [[liquipediatier::1]]');

  try {
    const response = await fetch(endpoint.toString(), {
      headers: { 'Authorization': `Apikey ${API_KEY}`, 'User-Agent': USER_AGENT }
    });
    
    const data = await response.json();
    const matches = data.result || [];

    console.log(`✅ Found ${matches.length} S-Tier matches.\n`);
    console.log("Recent Matchups:");
    
    matches.slice(0, 15).forEach(match => {
        const op1 = match.match2opponents[0].name;
        const op2 = match.match2opponents[1].name;
        const date = match.date;
        console.log(`[${date}] ${op1} vs ${op2}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

findTeamNames();