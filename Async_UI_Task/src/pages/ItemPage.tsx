import { useParams, useNavigate } from "react-router";
import useStory from "../hooks/useStory";
import ErrorMessage from "../components/ErrorMessage";

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storyId = parseInt(id ?? "", 10);

  const { data: story, isLoading, isError, error, refetch } = useStory(storyId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 min-h-[44px] transition-colors"
      >
        ← Back
      </button>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      )}

      {isError && (
        <ErrorMessage
          message={error instanceof Error ? error.message : "Failed to load story"}
          onRetry={refetch}
        />
      )}

      {story && (
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-3">
            {story.title}
          </h1>

          {story.url && (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {story.url}
            </a>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <span>
              <span className="font-medium text-gray-700">{story.score}</span> points
            </span>
            <span>
              by <span className="font-medium text-gray-700">{story.by}</span>
            </span>
            <span>{timeAgo(story.time)}</span>
            <span>
              <span className="font-medium text-gray-700">{story.descendants ?? 0}</span> comments
            </span>
          </div>

          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 px-4 py-2.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            View discussion on Hacker News
          </a>
        </div>
      )}
    </div>
  );
}

export default ItemPage;
