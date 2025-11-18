export const prerender = false; // This route must be dynamic

export async function GET() {
  const hookUrl = import.meta.env.REBUILD_HOOK_URL;

  if (!hookUrl) {
    return new Response('No hook URL found', { status: 500 });
  }

  try {
    // This pushes the "Deploy" button for you
    const response = await fetch(hookUrl, { method: 'POST' });
    
    return new Response(`Rebuild triggered! Status: ${response.status}`, {
      status: 200,
    });
  } catch (error) {
    return new Response(`Error triggering rebuild: ${error.message}`, {
      status: 500,
    });
  }
}