import { useState } from "react";
import { useNavigate } from "react-router";
import SearchBar from "../components/SearchBar";
import RawFetchStories from "../components/RawFetchStories";
import ReactQueryStories from "../components/ReactQueryStories";
import useDebounce from "../hooks/useDebounce";

type Mode = "raw" | "rq";

function HomePage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("rq");
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Top Stories</h1>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setMode("rq")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "rq"
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            React Query
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
              mode === "raw"
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Raw Fetch
          </button>
        </div>
      </div>

      <div className="mb-4 text-xs text-gray-400">
        {mode === "rq"
          ? "React Query — cached results load instantly on repeat visits"
          : "Raw Fetch — always refetches, no caching"}
      </div>

      <div className="mb-6">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {mode === "rq" ? (
        <ReactQueryStories
          query={debouncedQuery}
          onStoryClick={(id) => navigate(`/item/${id}`)}
        />
      ) : (
        <RawFetchStories
          query={debouncedQuery}
          onStoryClick={(id) => navigate(`/item/${id}`)}
        />
      )}
    </div>
  );
}

export default HomePage;
