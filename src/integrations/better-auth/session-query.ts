import { queryOptions } from "@tanstack/react-query";
import { getSession } from "@/server/auth";

/** Shared by root guards; fetchQuery revalidates stale or invalidated sessions. */
export const sessionQueryOptions = queryOptions({
	queryKey: ["auth", "session"],
	queryFn: () => getSession(),
	staleTime: 30_000,
	// Keep a failed session check from holding navigation through retry backoff.
	retry: false,
});
