import { fetchStory, fetchTopStories, searchStories, normalizeAlgoliaHit } from "../api/hn";
import type { AlgoliaStory, HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 1,
  title: "Hello World",
  url: "https://example.com",
  by: "user",
  score: 50,
  time: 1700000000,
  descendants: 10,
  type: "story",
};

const mockAlgoliaHit: AlgoliaStory = {
  objectID: "42",
  title: "Algolia Story",
  url: "https://algolia.com",
  author: "algoliauser",
  points: 99,
  created_at: "2024-01-01T00:00:00.000Z",
  num_comments: 5,
};

describe("fetchStory", () => {
  it("returns a story on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStory),
    } as unknown as Response);

    const story = await fetchStory(1);
    expect(story.id).toBe(1);
    expect(story.title).toBe("Hello World");
  });

  it("throws on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    await expect(fetchStory(1)).rejects.toThrow("404");
  });

  it("throws when story is null", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    } as unknown as Response);

    await expect(fetchStory(1)).rejects.toThrow("not found");
  });
});

describe("fetchTopStories", () => {
  it("fetches IDs then fetches each story", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1, 2]),
      } as unknown as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStory),
      } as unknown as Response);

    const stories = await fetchTopStories(2);
    expect(stories.length).toBeGreaterThanOrEqual(1);
  });

  it("filters out non-story types", async () => {
    const jobItem = { ...mockStory, type: "job" as const };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1]),
      } as unknown as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(jobItem),
      } as unknown as Response);

    const stories = await fetchTopStories(1);
    expect(stories).toHaveLength(0);
  });
});

describe("searchStories", () => {
  it("returns normalized stories from Algolia", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: [mockAlgoliaHit] }),
    } as unknown as Response);

    const results = await searchStories("hello");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Algolia Story");
    expect(results[0].by).toBe("algoliauser");
  });

  it("throws on failed search", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(searchStories("test")).rejects.toThrow("500");
  });
});

describe("normalizeAlgoliaHit", () => {
  it("maps Algolia fields to HNStory shape", () => {
    const story = normalizeAlgoliaHit(mockAlgoliaHit);
    expect(story.id).toBe(42);
    expect(story.by).toBe("algoliauser");
    expect(story.score).toBe(99);
    expect(story.descendants).toBe(5);
    expect(story.type).toBe("story");
  });
});
