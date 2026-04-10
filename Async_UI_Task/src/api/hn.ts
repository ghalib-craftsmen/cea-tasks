import type { AlgoliaStory, HNStory } from "../types/hn";

const FIREBASE_BASE = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

async function fetchTopStoryIds(signal?: AbortSignal): Promise<number[]> {
  const res = await fetch(`${FIREBASE_BASE}/topstories.json`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch top stories (${res.status})`);
  return res.json() as Promise<number[]>;
}

export async function fetchStory(
  id: number,
  signal?: AbortSignal,
): Promise<HNStory> {
  const res = await fetch(`${FIREBASE_BASE}/item/${id}.json`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch story ${id} (${res.status})`);
  const data = (await res.json()) as HNStory;
  if (!data) throw new Error(`Story ${id} not found`);
  return data;
}

export async function fetchTopStories(
  limit = 20,
  signal?: AbortSignal,
): Promise<HNStory[]> {
  const ids = await fetchTopStoryIds(signal);
  const stories = await Promise.all(
    ids.slice(0, limit).map((id) => fetchStory(id, signal)),
  );
  return stories.filter((s) => s.type === "story" && Boolean(s.title));
}

export function normalizeAlgoliaHit(hit: AlgoliaStory): HNStory {
  return {
    id: parseInt(hit.objectID, 10),
    title: hit.title,
    url: hit.url,
    by: hit.author,
    score: hit.points ?? 0,
    time: Math.floor(new Date(hit.created_at).getTime() / 1000),
    descendants: hit.num_comments ?? 0,
    type: "story",
  };
}

export async function searchStories(
  query: string,
  signal?: AbortSignal,
): Promise<HNStory[]> {
  const url = new URL(`${ALGOLIA_BASE}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("tags", "story");
  url.searchParams.set("hitsPerPage", "20");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as { hits: AlgoliaStory[] };
  return data.hits.map(normalizeAlgoliaHit);
}
