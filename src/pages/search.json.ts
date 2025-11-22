import { getCollection } from 'astro:content';

export async function GET() {
  const players = await getCollection('players');
  const teams = await getCollection('teams');

  // 1. Map Players to a simple format
  const playerItems = players.map(p => ({
    type: 'Player',
    name: p.data.name,
    subtitle: `${p.data.role} • ${p.data.team}`, // "Damage • team-falcons"
    slug: `/players/${p.slug}/`,
    // Search keywords (name, role, real name)
    keywords: `${p.data.name} ${p.data.fullName || ''} ${p.data.role}`.toLowerCase()
  }));

  // 2. Map Teams
  const teamItems = teams.map(t => ({
    type: 'Team',
    name: t.data.name,
    subtitle: t.data.region,
    slug: `/teams/${t.slug}/`,
    keywords: `${t.data.name} ${t.data.region} ${t.data.liquipediaName || ''}`.toLowerCase()
  }));

  return new Response(
    JSON.stringify([...teamItems, ...playerItems]),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}