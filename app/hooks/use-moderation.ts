import { trpc } from "~/lib/trpc";

export function useModeration() {
	return {
		// Admin photo moderation hooks
		usePendingPhotos: (params: {
			competitionId?: string;
			limit?: number;
			offset?: number;
		}) =>
			trpc.moderation.getPendingPhotos.useQuery(params, {
				staleTime: 30 * 1000, // Pending photos change frequently
			}),

		useApprovePhoto: () => trpc.moderation.approvePhoto.useMutation(),
		useRejectPhoto: () => trpc.moderation.rejectPhoto.useMutation(),
		useDeletePhoto: () => trpc.moderation.deletePhoto.useMutation(),
		useBulkPhotoAction: () => trpc.moderation.bulkPhotoAction.useMutation(),

		// User reporting hooks
		useCreateReport: () => trpc.moderation.createReport.useMutation(),
		useUserReports: () =>
			trpc.moderation.getUserReports.useQuery(undefined, {
				staleTime: 2 * 60 * 1000, // User reports change infrequently
			}),

		// Admin report management hooks
		useReports: (params: {
			status?: string;
			limit?: number;
			offset?: number;
		}) =>
			trpc.moderation.getReports.useQuery(params, {
				staleTime: 60 * 1000, // Reports change moderately
			}),

		useResolveReport: () => trpc.moderation.resolveReport.useMutation(),

		// Statistics
		useModerationStats: () =>
			trpc.moderation.getModerationStats.useQuery(undefined, {
				staleTime: 5 * 60 * 1000, // Stats change infrequently
			}),
	};
}
