import { useRef, useEffect, useState } from "react";
import StoryList from "./StoryList";
import FetchStatusBadge from "./FetchStatusBadge";
import useStories from "../hooks/useStories";

interface Props {
  query: string;
  onStoryClick: (id: number) => void;
}

function ReactQueryStories({ query, onStoryClick }: Props) {
  const { data: stories, isLoading, isFetching, isError, error, refetch } =
    useStories(query);

  // If isLoading is false on first render, data came from cache
  const wasInitiallyCached = useRef(!isLoading);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    wasInitiallyCached.current = !isLoading;
  // Only run on query change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (isFetching) {
      startRef.current = Date.now();
    } else if (!isFetching && stories) {
      setElapsedMs(Date.now() - startRef.current);
    }
  }, [isFetching, stories]);

  let badgeState: "fetching" | "cached" | "network" = "fetching";
  if (!isFetching && stories) {
    badgeState = wasInitiallyCached.current ? "cached" : "network";
  }

  return (
    <div className="rounded-lg border border-blue-200 p-4 bg-blue-50/30">
      <FetchStatusBadge state={badgeState} elapsedMs={elapsedMs ?? 0} />
      <StoryList
        stories={stories}
        isLoading={isLoading}
        isError={isError}
        errorMessage={
          error instanceof Error ? error.message : "Unexpected error occurred"
        }
        onRetry={refetch}
        onStoryClick={onStoryClick}
      />
    </div>
  );
}

export default ReactQueryStories;
