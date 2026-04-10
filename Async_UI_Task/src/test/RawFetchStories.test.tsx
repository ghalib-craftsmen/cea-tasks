import { render, screen, waitFor } from "@testing-library/react";
import RawFetchStories from "../components/RawFetchStories";
import type { HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 1,
  title: "Raw Fetch Story",
  url: "https://example.com",
  by: "user",
  score: 10,
  time: Math.floor(Date.now() / 1000),
  descendants: 0,
  type: "story",
};

describe("RawFetchStories", () => {
  it("shows loading skeleton initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<RawFetchStories query="" onStoryClick={vi.fn()} />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows stories after successful fetch", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1]),
      } as unknown as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStory),
      } as unknown as Response);

    render(<RawFetchStories query="" onStoryClick={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Raw Fetch Story")).toBeInTheDocument()
    );
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<RawFetchStories query="" onStoryClick={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    );
  });

  it("uses search endpoint when query is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: [] }),
    } as unknown as Response);

    render(<RawFetchStories query="react" onStoryClick={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("No stories found")).toBeInTheDocument()
    );

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("hn.algolia.com");
    expect(url).toContain("react");
  });
});
