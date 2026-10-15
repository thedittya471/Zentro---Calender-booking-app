import { QueryClient, queryOptions } from "@tanstack/react-query";
import { getReadiness } from "./api.ts";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export const readinessQuery = queryOptions({
  queryKey: ["service", "readiness"],
  queryFn: ({ signal }) => getReadiness(signal),
});
