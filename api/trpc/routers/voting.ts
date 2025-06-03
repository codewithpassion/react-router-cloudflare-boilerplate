import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	AlreadyVotedError,
	CannotVoteOwnPhotoError,
	PhotoNotApprovedException,
	PhotoNotFoundError,
} from "../../errors";
import { VotingService } from "../../services/voting.service";
import { idSchema, paginationSchema } from "../schemas/common";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const getPhotosInputSchema = paginationSchema.extend({
	competitionId: idSchema,
	categoryId: idSchema.optional(),
	sortBy: z.enum(["votes", "date", "title"]).default("votes"),
	order: z.enum(["asc", "desc"]).default("desc"),
});

const getUserVoteHistorySchema = z.object({
	competitionId: idSchema.optional(),
});

const getTopPhotosSchema = z.object({
	competitionId: idSchema,
	categoryId: idSchema.optional(),
	limit: z.number().min(1).max(50).default(10),
});

export const votingRouter = createTRPCRouter({
	// Cast a vote (requires authentication)
	castVote: protectedProcedure
		.input(z.object({ photoId: idSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				const votingService = new VotingService(ctx.db);
				const result = await votingService.castVote(ctx.user.id, input.photoId);

				return {
					success: true,
					voteCount: result.voteCount,
					userHasVoted: true,
				};
			} catch (error) {
				if (
					error instanceof AlreadyVotedError ||
					error instanceof CannotVoteOwnPhotoError ||
					error instanceof PhotoNotFoundError ||
					error instanceof PhotoNotApprovedException
				) {
					throw error;
				}

				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message || "Failed to cast vote",
				});
			}
		}),

	// Get vote status for a photo (public with optional auth)
	getVoteStatus: publicProcedure
		.input(z.object({ photoId: idSchema }))
		.query(async ({ ctx, input }) => {
			const votingService = new VotingService(ctx.db);
			return await votingService.getUserVoteStatus(
				ctx.user?.id || null,
				input.photoId,
			);
		}),

	// Get photos with votes (public with optional auth for user status)
	getPhotosWithVotes: publicProcedure
		.input(getPhotosInputSchema)
		.query(async ({ ctx, input }) => {
			const { competitionId, categoryId, sortBy, order, limit, offset } = input;

			const votingService = new VotingService(ctx.db);
			return await votingService.getPhotosWithVotes(
				competitionId,
				{ categoryId, sortBy, order, limit, offset },
				ctx.user?.id,
			);
		}),

	// Get user's vote history (requires authentication)
	getUserVoteHistory: protectedProcedure
		.input(getUserVoteHistorySchema)
		.query(async ({ ctx, input }) => {
			const votingService = new VotingService(ctx.db);
			return await votingService.getUserVoteHistory(
				ctx.user.id,
				input.competitionId,
			);
		}),

	// Get top photos (public)
	getTopPhotos: publicProcedure
		.input(getTopPhotosSchema)
		.query(async ({ ctx, input }) => {
			const { competitionId, categoryId, limit } = input;
			const votingService = new VotingService(ctx.db);
			return await votingService.getTopPhotos(competitionId, categoryId, limit);
		}),

	// Get voting statistics (public)
	getVotingStats: publicProcedure
		.input(z.object({ competitionId: idSchema }))
		.query(async ({ ctx, input }) => {
			const votingService = new VotingService(ctx.db);
			return await votingService.getVotingStats(input.competitionId);
		}),
});
