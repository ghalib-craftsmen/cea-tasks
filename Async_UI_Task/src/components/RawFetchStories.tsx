import { useEffect, useReducer, useCallback, useRef, useState } from "react";
import type { HNStory } from "../types/hn";
import { fetchTopStories, searchStories } from "../api/hn";
import StoryList from "./StoryList";
import FetchStatusBadge from "./FetchStatusBadge";

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

interface Props {
  query: string;
  onStoryClick: (id: number) => void;
}

function RawFetchStories({ query, onStoryClick }: Props) {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startRef = useRef<number>(0);

  const runFetch = useCallback((q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    startRef.current = Date.now();

    dispatch({ type: "FETCH_START" });
    setElapsedMs(null);

    const fetcher = q.trim()
      ? searchStories(q.trim(), controller.signal)
      : fetchTopStories(20, controller.signal);

    fetcher
      .then((stories) => {
        setElapsedMs(Date.now() - startRef.current);
        dispatch({ type: "FETCH_SUCCESS", stories });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, []);

  useEffect(() => {
    runFetch(query);
    return () => abortRef.current?.abort();
  }, [query, runFetch]);

  const badgeState =
    state.status === "loading"
      ? "fetching"
      : "network";

  return (
    <div className="rounded-lg border border-orange-200 p-4 bg-orange-50/30">
      <FetchStatusBadge state={badgeState} elapsedMs={elapsedMs ?? 0} />
      <StoryList
        stories={state.status === "success" ? state.stories : undefined}
        isLoading={state.status === "loading"}
        isError={state.status === "error"}
        errorMessage={state.status === "error" ? state.message : ""}
        onRetry={() => runFetch(query)}
        onStoryClick={onStoryClick}
      />
    </div>
  );
}

export default RawFetchStories;
