import { useQuery } from "@tanstack/react-query";
import { fetchStory } from "../api/hn";

function useStory(id: number) {
  return useQuery({
    queryKey: ["story", id],
    queryFn: ({ signal }) => fetchStory(id, signal),
    enabled: !isNaN(id),
  });
}

export default useStory;
