import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { trpc, trpcClient } from "~/lib/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // 5 minutes
						retry: (failureCount, error: Error) => {
							// Don't retry on 4xx errors
							const httpError = error as { response?: { status?: number } };
							if (
								httpError?.response?.status &&
								httpError.response.status >= 400 &&
								httpError.response.status < 500
							) {
								return false;
							}
							return failureCount < 3;
						},
					},
				},
			}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
