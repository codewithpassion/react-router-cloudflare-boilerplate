import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PhotoAlreadyModeratedError, PhotoNotFoundError } from "../../errors";
import { ModerationService } from "../../services/moderation.service";
import {
	idSchema,
	paginationSchema,
	reportReasonSchema,
	reportStatusSchema,
} from "../schemas/common";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "../trpc";

const getPendingPhotosSchema = paginationSchema.extend({
	competitionId: idSchema.optional(),
});

const moderatePhotoSchema = z.object({
	id: idSchema,
	reason: z.string().min(1).max(500).optional(),
});

const bulkActionSchema = z.object({
	action: z.enum(["approve", "reject", "delete"]),
	photoIds: z.array(idSchema).min(1).max(50),
	reason: z.string().min(1).max(500).optional(),
});

const createReportSchema = z.object({
	photoId: idSchema,
	reason: reportReasonSchema,
	description: z.string().min(1).max(1000).optional(),
});

const getReportsSchema = paginationSchema.extend({
	status: reportStatusSchema.optional(),
});

const resolveReportSchema = z.object({
	id: idSchema,
	action: z.enum(["resolved", "dismissed"]),
	adminNotes: z.string().max(1000).optional(),
	photoAction: z.enum(["approve", "reject", "delete"]).optional(),
	photoActionReason: z.string().max(500).optional(),
});

export const moderationRouter = createTRPCRouter({
	// Photo moderation (Admin only)
	getPendingPhotos: adminProcedure
		.input(getPendingPhotosSchema)
		.query(async ({ ctx, input }) => {
			const moderationService = new ModerationService(ctx.db);
			return await moderationService.getPendingPhotos(input);
		}),

	approvePhoto: adminProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.approvePhoto(input.id, ctx.user.id);
			} catch (error) {
				if (
					error instanceof PhotoNotFoundError ||
					error instanceof PhotoAlreadyModeratedError
				) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	rejectPhoto: adminProcedure
		.input(moderatePhotoSchema)
		.mutation(async ({ ctx, input }) => {
			if (!input.reason) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Rejection reason is required",
				});
			}

			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.rejectPhoto(
					input.id,
					ctx.user.id,
					input.reason,
				);
			} catch (error) {
				if (
					error instanceof PhotoNotFoundError ||
					error instanceof PhotoAlreadyModeratedError
				) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	deletePhoto: adminProcedure
		.input(moderatePhotoSchema)
		.mutation(async ({ ctx, input }) => {
			if (!input.reason) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Deletion reason is required",
				});
			}

			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.deletePhoto(
					input.id,
					ctx.user.id,
					input.reason,
				);
			} catch (error) {
				if (error instanceof PhotoNotFoundError) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	bulkPhotoAction: adminProcedure
		.input(bulkActionSchema)
		.mutation(async ({ ctx, input }) => {
			const { action, photoIds, reason } = input;

			if ((action === "reject" || action === "delete") && !reason) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Reason is required for ${action} action`,
				});
			}

			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.bulkPhotoAction(
					photoIds,
					action,
					ctx.user.id,
					reason,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// User reporting
	createReport: protectedProcedure
		.input(createReportSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.createReport({
					reporterId: ctx.user.id,
					...input,
				});
			} catch (error) {
				if (error instanceof PhotoNotFoundError) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	getUserReports: protectedProcedure.query(async ({ ctx }) => {
		const moderationService = new ModerationService(ctx.db);
		return await moderationService.getUserReports(ctx.user.id);
	}),

	// Admin report management
	getReports: adminProcedure
		.input(getReportsSchema)
		.query(async ({ ctx, input }) => {
			const moderationService = new ModerationService(ctx.db);
			return await moderationService.getReports(input);
		}),

	resolveReport: adminProcedure
		.input(resolveReportSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const moderationService = new ModerationService(ctx.db);
				return await moderationService.resolveReport(input.id, ctx.user.id, {
					action: input.action,
					adminNotes: input.adminNotes,
					photoAction: input.photoAction,
					photoActionReason: input.photoActionReason,
				});
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Moderation statistics
	getModerationStats: adminProcedure.query(async ({ ctx }) => {
		const moderationService = new ModerationService(ctx.db);
		return await moderationService.getModerationStats();
	}),
});
