import { trpc } from "~/lib/trpc";

export function useVoting() {
	return {
		// Cast vote with optimistic updates
		useCastVote: () => trpc.voting.castVote.useMutation(),

		// Get vote status for a photo
		useVoteStatus: (photoId: string) =>
			trpc.voting.getVoteStatus.useQuery({ photoId }, { enabled: !!photoId }),

		// Get photos with votes (with optional filtering)
		usePhotosWithVotes: (params: {
			competitionId: string;
			categoryId?: string;
			sortBy?: "votes" | "date" | "title";
			order?: "asc" | "desc";
			limit?: number;
			offset?: number;
		}) =>
			trpc.voting.getPhotosWithVotes.useQuery(params, {
				enabled: !!params.competitionId,
				staleTime: 30 * 1000, // Vote counts change frequently
			}),

		// Get user's vote history
		useUserVoteHistory: (competitionId?: string) =>
			trpc.voting.getUserVoteHistory.useQuery(
				{ competitionId },
				{ staleTime: 5 * 60 * 1000 }, // Vote history is relatively stable
			),

		// Get top photos
		useTopPhotos: (params: {
			competitionId: string;
			categoryId?: string;
			limit?: number;
		}) =>
			trpc.voting.getTopPhotos.useQuery(params, {
				enabled: !!params.competitionId,
				staleTime: 2 * 60 * 1000, // Top photos change moderately
			}),

		// Get voting statistics
		useVotingStats: (competitionId: string) =>
			trpc.voting.getVotingStats.useQuery(
				{ competitionId },
				{
					enabled: !!competitionId,
					staleTime: 5 * 60 * 1000,
				},
			),
	};
}
