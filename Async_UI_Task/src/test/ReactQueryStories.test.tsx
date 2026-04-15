import { render, screen, waitFor } from "@testing-library/react";
import ReactQueryStories from "../components/ReactQueryStories";
import { createWrapper } from "./utils";
import * as api from "../api/hn";
import type { HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 2,
  title: "React Query Story",
  url: "https://reactquery.com",
  by: "rquser",
  score: 200,
  time: Math.floor(Date.now() / 1000),
  descendants: 15,
  type: "story",
};

describe("ReactQueryStories", () => {
  it("shows loading skeleton initially", () => {
    vi.spyOn(api, "fetchTopStories").mockReturnValue(new Promise(() => {}));
    render(<ReactQueryStories query="" onStoryClick={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders stories after fetch", async () => {
    vi.spyOn(api, "fetchTopStories").mockResolvedValue([mockStory]);
    render(<ReactQueryStories query="" onStoryClick={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(screen.getByText("React Query Story")).toBeInTheDocument()
    );
  });

  it("shows error state on failure", async () => {
    vi.spyOn(api, "fetchTopStories").mockRejectedValue(new Error("Failed"));
    render(<ReactQueryStories query="" onStoryClick={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    );
  });

  it("shows empty state when no results", async () => {
    vi.spyOn(api, "searchStories").mockResolvedValue([]);
    render(<ReactQueryStories query="noresults" onStoryClick={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(screen.getByText("No stories found")).toBeInTheDocument()
    );
  });
});
