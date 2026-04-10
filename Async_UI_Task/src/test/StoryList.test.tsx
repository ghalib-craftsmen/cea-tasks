import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StoryList from "../components/StoryList";
import type { HNStory } from "../types/hn";

const mockStory: HNStory = {
  id: 1,
  title: "Test Story Title",
  url: "https://example.com",
  by: "testuser",
  score: 100,
  time: Math.floor(Date.now() / 1000) - 3600,
  descendants: 42,
  type: "story",
};

const baseProps = {
  isLoading: false,
  isError: false,
  errorMessage: "",
  onRetry: vi.fn(),
  onStoryClick: vi.fn(),
};

describe("StoryList — 4 async states", () => {
  it("loading: renders skeleton cards", () => {
    render(<StoryList {...baseProps} isLoading={true} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("error: shows error message and retry button", async () => {
    const onRetry = vi.fn();
    render(
      <StoryList
        {...baseProps}
        isError={true}
        errorMessage="Network error"
        onRetry={onRetry}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("empty: shows empty state when no stories", () => {
    render(<StoryList {...baseProps} stories={[]} />);
    expect(screen.getByText("No stories found")).toBeInTheDocument();
  });

  it("success: renders story cards", () => {
    render(<StoryList {...baseProps} stories={[mockStory]} />);
    expect(screen.getByText("Test Story Title")).toBeInTheDocument();
    expect(screen.getByText(/testuser/)).toBeInTheDocument();
  });

  it("success: calls onStoryClick with correct id", async () => {
    const onStoryClick = vi.fn();
    render(
      <StoryList {...baseProps} stories={[mockStory]} onStoryClick={onStoryClick} />
    );
    await userEvent.click(screen.getByText("Test Story Title"));
    expect(onStoryClick).toHaveBeenCalledWith(1);
  });
});
