import { useQuery } from "@tanstack/react-query";
import { fetchTopStories, searchStories } from "../api/hn";

function useStories(query: string) {
  const isSearching = query.trim().length > 0;

  return useQuery({
    queryKey: isSearching ? ["search", query.trim()] : ["topStories"],
    queryFn: ({ signal }) =>
      isSearching
        ? searchStories(query.trim(), signal)
        : fetchTopStories(20, signal),
  });
}

export default useStories;
