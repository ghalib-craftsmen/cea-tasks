interface Props {
  state: "fetching" | "cached" | "network";
  elapsedMs?: number;
}

function FetchStatusBadge({ state, elapsedMs }: Props) {
  if (state === "fetching") {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        Fetching from network...
      </div>
    );
  }

  if (state === "cached") {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 mb-4">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        ⚡ Served from cache — no network request
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-orange-500 mb-4">
      <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
      Fetched from network in {elapsedMs}ms
    </div>
  );
}

export default FetchStatusBadge;
