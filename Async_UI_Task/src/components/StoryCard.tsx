import type { HNStory } from "../types/hn";

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getDomain(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

interface Props {
  story: HNStory;
  onClick: () => void;
}

function StoryCard({ story, onClick }: Props) {
  const domain = getDomain(story.url);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="w-8 h-8 rounded shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 bg-orange-100 rounded shrink-0 mt-0.5 flex items-center justify-center text-orange-500 text-xs font-bold">
            HN
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {story.title}
          </p>
          {domain && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{domain}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
            <span>{story.score} pts</span>
            <span>by {story.by}</span>
            <span>{story.descendants ?? 0} comments</span>
            <span>{timeAgo(story.time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoryCard;
