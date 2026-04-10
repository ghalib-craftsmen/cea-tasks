export interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  time: number;
  descendants: number;
  type: "story" | "job" | "comment" | "poll";
}

export interface AlgoliaStory {
  objectID: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  created_at: string;
  num_comments: number;
}

export interface AlgoliaSearchResult {
  hits: AlgoliaStory[];
  nbHits: number;
  query: string;
}
