import { useEffect, useReducer, useCallback, useState, useRef } from "react";
import type { HNStory } from "../types/hn";
import { fetchTopStories, searchStories } from "../api/hn";
import StoryCard from "../components/StoryCard";
import SkeletonCard from "../components/SkeletonCard";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import SearchBar from "../components/SearchBar";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; stories: HNStory[] };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; stories: HNStory[] }
  | { type: "FETCH_ERROR"; message: string };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { status: "loading" };
    case "FETCH_SUCCESS":
      return { status: "success", stories: action.stories };
    case "FETCH_ERROR":
      return { status: "error", message: action.message };
  }
}

function HomePage() {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const [query, setQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const loadStories = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "FETCH_START" });

    fetchTopStories(20, controller.signal)
      .then((stories) => dispatch({ type: "FETCH_SUCCESS", stories }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, []);

  useEffect(() => {
    loadStories();
    return () => abortRef.current?.abort();
  }, [loadStories]);

  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: "FETCH_START" });

      searchStories(query.trim(), controller.signal)
        .then((stories) => dispatch({ type: "FETCH_SUCCESS", stories }))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          const message =
            err instanceof Error ? err.message : "Unexpected error occurred";
          dispatch({ type: "FETCH_ERROR", message });
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (query.trim() === "") loadStories();
  }, [query, loadStories]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Top Stories</h1>

      <div className="mb-6">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {state.status === "loading" && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <ErrorMessage message={state.message} onRetry={loadStories} />
      )}

      {state.status === "success" && state.stories.length === 0 && (
        <EmptyState />
      )}

      {state.status === "success" && state.stories.length > 0 && (
        <div className="space-y-3">
          {state.stories.map((story) => (
            <StoryCard key={story.id} story={story} onClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
