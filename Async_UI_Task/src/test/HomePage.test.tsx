import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import HomePage from "../pages/HomePage";
import * as api from "../api/hn";
import type { HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 3,
  title: "Home Page Story",
  url: "https://example.org",
  by: "homeuser",
  score: 50,
  time: Math.floor(Date.now() / 1000),
  descendants: 5,
  type: "story",
};

function renderHomePage(search = "?mode=rq") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${search}`]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
  it("renders the Top Stories heading", () => {
    vi.spyOn(api, "fetchTopStories").mockReturnValue(new Promise(() => {}));
    renderHomePage();
    expect(screen.getByText("Top Stories")).toBeInTheDocument();
  });

  it("renders the mode toggle buttons", () => {
    vi.spyOn(api, "fetchTopStories").mockReturnValue(new Promise(() => {}));
    renderHomePage();
    expect(screen.getByRole("button", { name: "React Query" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Raw Fetch" })).toBeInTheDocument();
  });

  it("renders the search input", () => {
    vi.spyOn(api, "fetchTopStories").mockReturnValue(new Promise(() => {}));
    renderHomePage();
    expect(screen.getByPlaceholderText("Search stories...")).toBeInTheDocument();
  });

  it("shows the mode description text", () => {
    vi.spyOn(api, "fetchTopStories").mockReturnValue(new Promise(() => {}));
    renderHomePage("?mode=raw");
    expect(screen.getByText(/always hits the network/i)).toBeInTheDocument();
  });

  it("shows stories after successful fetch in RQ mode", async () => {
    vi.spyOn(api, "fetchTopStories").mockResolvedValue([mockStory]);
    renderHomePage();
    await waitFor(
      () => expect(screen.getByText("Home Page Story")).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it("calls searchStories when a query is debounced", async () => {
    const searchSpy = vi.spyOn(api, "searchStories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTopStories").mockResolvedValue([mockStory]);

    renderHomePage();
    const input = screen.getByPlaceholderText("Search stories...");
    await userEvent.type(input, "react");

    await waitFor(
      () => expect(searchSpy).toHaveBeenCalledWith("react", expect.any(AbortSignal)),
      { timeout: 2000 }
    );
  });
});
