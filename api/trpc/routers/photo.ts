import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PhotoNotFoundError, SubmissionLimitExceededError } from "../../errors";
import { PhotoService } from "../../services/photo.service";
import { dateStringSchema, idSchema } from "../schemas/common";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Note: File uploads in tRPC require special handling
// We'll need to use a multipart form data parser

const photoUploadSchema = z.object({
	categoryId: idSchema,
	title: z.string().min(1).max(200),
	description: z.string().min(20).max(500),
	dateTaken: dateStringSchema,
	location: z.string().min(1).max(200),
	cameraInfo: z.string().max(200).optional(),
	settings: z.string().max(200).optional(),
	// File will be handled separately in the multipart upload
});

const photoUpdateSchema = z.object({
	id: idSchema,
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(20).max(500).optional(),
	dateTaken: dateStringSchema.optional(),
	location: z.string().min(1).max(200).optional(),
	cameraInfo: z.string().max(200).optional(),
	settings: z.string().max(200).optional(),
});

const getUserPhotosSchema = z.object({
	competitionId: idSchema.optional(),
	categoryId: idSchema.optional(),
});

const photoUploadBase64Schema = z.object({
	fileData: z.string(), // Base64 encoded file
	fileName: z.string(),
	mimeType: z.enum(["image/jpeg", "image/png"]),
	categoryId: idSchema,
	title: z.string().min(1).max(200),
	description: z.string().min(20).max(500),
	dateTaken: dateStringSchema,
	location: z.string().min(1).max(200),
	cameraInfo: z.string().max(200).optional(),
	settings: z.string().max(200).optional(),
});

const createFromUploadSchema = z.object({
	fileId: z.string(),
	filePath: z.string(),
	fileSize: z.number(),
	mimeType: z.string(),
	categoryId: idSchema,
	title: z.string().min(1).max(200),
	description: z.string().min(20).max(500),
	dateTaken: dateStringSchema,
	location: z.string().min(1).max(200),
	cameraInfo: z.string().max(200).optional(),
	settings: z.string().max(200).optional(),
});

export const photoRouter = createTRPCRouter({
	// Upload photo (requires authentication)
	// Note: This will need special handling for file uploads
	upload: protectedProcedure
		.input(photoUploadSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const photoService = new PhotoService(ctx.db);

				// In a real implementation, you'd extract the file from the request
				// This might require custom middleware or a different approach
				// For now, we'll assume the file is handled separately

				const result = await photoService.uploadPhoto({
					userId: ctx.user.id,
					...input,
					file: ctx.file, // This would need to be extracted from multipart data
				});

				return result;
			} catch (error) {
				if (error instanceof SubmissionLimitExceededError) {
					throw error;
				}
				if (
					error.message.includes("Maximum") &&
					error.message.includes("photos allowed")
				) {
					throw new SubmissionLimitExceededError(
						Number.parseInt(error.message.match(/\d+/)?.[0] || "0"),
					);
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Upload via base64 (for smaller files)
	uploadBase64: protectedProcedure
		.input(photoUploadBase64Schema)
		.mutation(async ({ ctx, input }) => {
			try {
				const photoService = new PhotoService(ctx.db);

				// Decode base64 and create file
				const fileBuffer = Buffer.from(input.fileData, "base64");

				// Validate file size (10MB limit)
				if (fileBuffer.length > 10 * 1024 * 1024) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "File size cannot exceed 10MB",
					});
				}

				const file = new File([fileBuffer], input.fileName, {
					type: input.mimeType,
				});

				return await photoService.uploadPhoto({
					userId: ctx.user.id,
					categoryId: input.categoryId,
					title: input.title,
					description: input.description,
					dateTaken: input.dateTaken,
					location: input.location,
					cameraInfo: input.cameraInfo,
					settings: input.settings,
					file,
				});
			} catch (error) {
				if (error instanceof SubmissionLimitExceededError) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Create photo from uploaded file info
	createFromUpload: protectedProcedure
		.input(createFromUploadSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const photoService = new PhotoService(ctx.db);

				// Create a mock file object from the upload info
				const file = new File([], input.fileName, {
					type: input.mimeType,
				});
				// Override the size property
				Object.defineProperty(file, "size", { value: input.fileSize });

				return await photoService.uploadPhoto({
					userId: ctx.user.id,
					categoryId: input.categoryId,
					title: input.title,
					description: input.description,
					dateTaken: input.dateTaken,
					location: input.location,
					cameraInfo: input.cameraInfo,
					settings: input.settings,
					file,
				});
			} catch (error) {
				if (error instanceof SubmissionLimitExceededError) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Update photo metadata
	update: protectedProcedure
		.input(photoUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updates } = input;
			try {
				const photoService = new PhotoService(ctx.db);
				return await photoService.updatePhoto(id, ctx.user.id, updates);
			} catch (error) {
				if (error instanceof PhotoNotFoundError) {
					throw error;
				}
				if (error.message.includes("not found")) {
					throw new PhotoNotFoundError();
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Delete photo
	delete: protectedProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				const photoService = new PhotoService(ctx.db);
				return await photoService.deletePhoto(input.id, ctx.user.id);
			} catch (error) {
				if (error instanceof PhotoNotFoundError) {
					throw error;
				}
				if (error.message.includes("not found")) {
					throw new PhotoNotFoundError();
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	// Get user's photos
	getUserPhotos: protectedProcedure
		.input(getUserPhotosSchema)
		.query(async ({ ctx, input }) => {
			const photoService = new PhotoService(ctx.db);
			return await photoService.getUserPhotos(
				ctx.user.id,
				input.competitionId,
				input.categoryId,
			);
		}),

	// Get photo by ID (for editing)
	getById: protectedProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ ctx, input }) => {
			const photoService = new PhotoService(ctx.db);
			const photo = await photoService.getPhotoById(input.id, ctx.user.id);
			if (!photo) {
				throw new PhotoNotFoundError();
			}
			return photo;
		}),

	// Get submission counts for user
	getSubmissionCounts: protectedProcedure
		.input(z.object({ competitionId: idSchema.optional() }))
		.query(async ({ ctx, input }) => {
			const photoService = new PhotoService(ctx.db);
			return await photoService.getUserSubmissionCounts(
				ctx.user.id,
				input.competitionId,
			);
		}),
});
