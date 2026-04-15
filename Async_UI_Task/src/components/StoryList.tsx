import type { HNStory } from "../types/hn";
import StoryCard from "./StoryCard";
import SkeletonCard from "./SkeletonCard";
import ErrorMessage from "./ErrorMessage";
import EmptyState from "./EmptyState";

interface Props {
  stories?: HNStory[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  onStoryClick: (id: number) => void;
}

function StoryList({
  stories,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onStoryClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={errorMessage} onRetry={onRetry} />;
  }

  if (!stories || stories.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          onClick={() => onStoryClick(story.id)}
        />
      ))}
    </div>
  );
}

export default StoryList;
