import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import ItemPage from "../pages/ItemPage";
import * as api from "../api/hn";
import type { HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 99,
  title: "Detail Page Story",
  url: "https://detail.com",
  by: "detailuser",
  score: 300,
  time: Math.floor(Date.now() / 1000) - 7200,
  descendants: 20,
  type: "story",
};

function renderItemPage(id = "99") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/item/${id}`]}>
        <Routes>
          <Route path="/item/:id" element={<ItemPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ItemPage", () => {
  it("shows loading skeleton initially", () => {
    vi.spyOn(api, "fetchStory").mockReturnValue(new Promise(() => {}));
    renderItemPage();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders story details on success", async () => {
    vi.spyOn(api, "fetchStory").mockResolvedValue(mockStory);
    renderItemPage();
    await waitFor(() =>
      expect(screen.getByText("Detail Page Story")).toBeInTheDocument()
    );
    expect(screen.getByText(/detailuser/)).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it("shows the external URL link", async () => {
    vi.spyOn(api, "fetchStory").mockResolvedValue(mockStory);
    renderItemPage();
    await waitFor(() => screen.getByText("Detail Page Story"));
    expect(screen.getByText("https://detail.com")).toBeInTheDocument();
  });

  it("shows error state on failure", async () => {
    vi.spyOn(api, "fetchStory").mockRejectedValue(new Error("Not found"));
    renderItemPage();
    await waitFor(() =>
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    );
  });

  it("renders back button", async () => {
    vi.spyOn(api, "fetchStory").mockReturnValue(new Promise(() => {}));
    renderItemPage();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("back button navigates away", async () => {
    vi.spyOn(api, "fetchStory").mockReturnValue(new Promise(() => {}));
    renderItemPage();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
  });
});
