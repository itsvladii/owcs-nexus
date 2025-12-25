// supabase/functions/payout-bot/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CONFIG
const PANDA_API_URL = 'https://api.pandascore.co/ow/matches/past?sort=-end_at&per_page=5';

Deno.serve(async (req) => {
  // 1. Setup Admin Client (Bypasses RLS to write to DB)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const PANDA_TOKEN = Deno.env.get('PANDA_API_KEY');
  if (!PANDA_TOKEN) return new Response("Missing PANDA_API_KEY", { status: 500 });

  try {
    // 2. Fetch last 5 finished matches from PandaScore
    const response = await fetch(PANDA_API_URL, {
      headers: { 
        'Authorization': `Bearer ${PANDA_TOKEN}`,
        'Accept': 'application/json' 
      }
    });
    
    if (!response.ok) throw new Error(`Panda API Error: ${response.statusText}`);
    const matches = await response.json();
    
    const logs = [];

    // 3. Process Loop
    for (const match of matches) {
      // Skip if not finished or drawn
      if (match.status !== 'finished' || match.draw || !match.winner) continue;

      const matchId = match.id.toString();
      let winnerName = match.winner.name;

      // A. Check if already processed
      const { data: existing } = await supabase
        .from('processed_matches')
        .select('match_id')
        .eq('match_id', matchId)
        .single();

      if (existing) continue; // Skip silently

      // B. Resolve Team Name (Handle "CR" vs "Crazy Raccoon")
      const { data: mapping } = await supabase
        .from('team_mappings')
        .select('db_name')
        .eq('panda_name', winnerName)
        .single();
      
      if (mapping) winnerName = mapping.db_name;

      // C. Determine Multiplier (Is it a Major?)
      // Check tournament name for keywords
      const tournamentName = match.league?.name || '';
      const isMajor = tournamentName.toLowerCase().includes('major');
      const isFinals = tournamentName.toLowerCase().includes('final') || match.serie?.name?.toLowerCase().includes('final');
      
      let multiplier = 1.0;
      if (isFinals) multiplier = 5.0;      // 5x for Grand Finals
      else if (isMajor) multiplier = 3.0;  // 3x for Majors

      // D. EXECUTE PAYOUT 💸
      // This calls your PostgreSQL function
      const { data: payout, error } = await supabase.rpc('distribute_dividend', {
        p_team_name: winnerName,
        p_current_price: 0, // Let DB handle price lookups if needed, or pass 0 if logic is purely quantity-based
        p_payout_multiplier: multiplier
      });

      if (error) {
        logs.push(`❌ Error paying ${winnerName}: ${error.message}`);
      } else {
        // E. Save Record
        await supabase.from('processed_matches').insert({
          match_id: matchId,
          winner_name: winnerName,
          tournament: tournamentName,
          payout_amount: payout.total_distributed
        });
        logs.push(`✅ Paid ${winnerName} (${multiplier}x) - $${payout.total_distributed}`);
      }
    }

    return new Response(JSON.stringify({ success: true, logs }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});