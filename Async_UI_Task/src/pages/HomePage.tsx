import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import SearchBar from "../components/SearchBar";
import RawFetchStories from "../components/RawFetchStories";
import ReactQueryStories from "../components/ReactQueryStories";
import useDebounce from "../hooks/useDebounce";

type Mode = "raw" | "rq";

function HomePage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode: Mode = searchParams.get("mode") === "raw" ? "raw" : "rq";

  function setMode(m: Mode) {
    setSearchParams({ mode: m }, { replace: true });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Top Stories
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {mode === "rq"
              ? "Cached - revisit any query instantly"
              : "Raw fetch - always hits the network"}
          </p>
        </div>

        <div className="flex items-center bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setMode("rq")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === "rq"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            React Query
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode === "raw"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Raw Fetch
          </button>
        </div>
      </div>

      <div className="mb-5">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {mode === "rq" ? (
        <ReactQueryStories
          query={debouncedQuery}
          onStoryClick={(id) => navigate(`/item/${id}?mode=${mode}`)}
        />
      ) : (
        <RawFetchStories
          query={debouncedQuery}
          onStoryClick={(id) => navigate(`/item/${id}?mode=${mode}`)}
        />
      )}
    </div>
  );
}

export default HomePage;
