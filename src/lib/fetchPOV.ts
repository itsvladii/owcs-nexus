// src/lib/youtube.ts

// This function will fetch and return a single URL, or null
export async function fetchRecentPov(
  playerName: string,
  channelId: string,
  apiKey: string
): Promise<string | null> {
  
  if (!apiKey) {
    console.warn("YouTube fetch skipped: YOUTUBE_API_KEY is not set.");
    return null;
  }

  if (!channelId) {
    console.warn("YouTube fetch skipped: No POV_CHANNEL_ID was provided.");
    return null;
  }

  try {
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
    endpoint.searchParams.set('key', apiKey);
    endpoint.searchParams.set('channelId', channelId);
    endpoint.searchParams.set('q', `${playerName} POV`); // Search for "Proper POV"
    endpoint.searchParams.set('order', 'date'); // Get the most recent
    endpoint.searchParams.set('maxResults', '1');
    endpoint.searchParams.set('type', 'video');
    endpoint.searchParams.set('part', 'snippet,id');

    const response = await fetch(endpoint.toString());
    
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        // Return the "embed" URL
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } else {
      console.warn(`YouTube API error: ${response.status} ${response.statusText}`);
      console.log(response)
    }
  } catch (error) {
    console.error("Error fetching YouTube POV:", error);
  }

  // If anything fails, return null
  return null;
}