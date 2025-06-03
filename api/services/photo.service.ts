import { and, count, desc, eq } from "drizzle-orm";
import type { DatabaseType } from "../database/db";
import { categories, competitions, photos } from "../database/schema";
import {
	CompetitionNotActiveError,
	PhotoNotFoundError,
	SubmissionLimitExceededError,
} from "../errors";
import { generatePhotoId } from "../utils/id";

export class PhotoService {
	constructor(private db: DatabaseType) {}

	async uploadPhoto(data: {
		userId: string;
		categoryId: string;
		title: string;
		description: string;
		dateTaken: string;
		location: string;
		cameraInfo?: string;
		settings?: string;
		file: File;
	}) {
		// Check if category exists and get competition info
		const category = await this.db
			.select({
				id: categories.id,
				competitionId: categories.competitionId,
				maxPhotosPerUser: categories.maxPhotosPerUser,
				competition: {
					status: competitions.status,
				},
			})
			.from(categories)
			.innerJoin(competitions, eq(categories.competitionId, competitions.id))
			.where(eq(categories.id, data.categoryId))
			.get();

		if (!category) {
			throw new Error("Category not found");
		}

		// Check if competition is active
		if (category.competition.status !== "open") {
			throw new CompetitionNotActiveError();
		}

		// Check submission limits
		const currentCount = await this.db
			.select({ count: count() })
			.from(photos)
			.where(
				and(
					eq(photos.userId, data.userId),
					eq(photos.categoryId, data.categoryId),
				),
			)
			.get();

		if (currentCount.count >= category.maxPhotosPerUser) {
			throw new SubmissionLimitExceededError(category.maxPhotosPerUser);
		}

		// In a real implementation, you would upload the file to R2 or similar storage
		// For now, we'll simulate the file path
		const photoId = generatePhotoId();
		const filePath = `/uploads/${category.competitionId}/${photoId}.${data.file.type.split("/")[1]}`;

		// Insert photo record
		const now = new Date();
		const photo = await this.db
			.insert(photos)
			.values({
				id: photoId,
				userId: data.userId,
				competitionId: category.competitionId,
				categoryId: data.categoryId,
				title: data.title,
				description: data.description,
				filePath,
				fileSize: data.file.size,
				mimeType: data.file.type,
				dateTaken: new Date(data.dateTaken),
				location: data.location,
				cameraInfo: data.cameraInfo,
				settings: data.settings,
				status: "pending",
				createdAt: now,
				updatedAt: now,
			})
			.returning()
			.get();

		return photo;
	}

	async updatePhoto(
		photoId: string,
		userId: string,
		updates: {
			title?: string;
			description?: string;
			dateTaken?: string;
			location?: string;
			cameraInfo?: string;
			settings?: string;
		},
	) {
		// Check if photo exists and belongs to user
		const existingPhoto = await this.db
			.select({
				id: photos.id,
				userId: photos.userId,
				status: photos.status,
			})
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!existingPhoto) {
			throw new PhotoNotFoundError();
		}

		if (existingPhoto.userId !== userId) {
			throw new Error("You can only edit your own photos");
		}

		if (existingPhoto.status !== "pending") {
			throw new Error("Cannot edit photos that have been moderated");
		}

		// Update photo
		const updatedPhoto = await this.db
			.update(photos)
			.set({
				...updates,
				dateTaken: updates.dateTaken ? new Date(updates.dateTaken) : undefined,
				updatedAt: new Date(),
			})
			.where(eq(photos.id, photoId))
			.returning()
			.get();

		return updatedPhoto;
	}

	async deletePhoto(photoId: string, userId: string) {
		// Check if photo exists and belongs to user
		const existingPhoto = await this.db
			.select({
				id: photos.id,
				userId: photos.userId,
				status: photos.status,
			})
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!existingPhoto) {
			throw new PhotoNotFoundError();
		}

		if (existingPhoto.userId !== userId) {
			throw new Error("You can only delete your own photos");
		}

		if (existingPhoto.status !== "pending") {
			throw new Error("Cannot delete photos that have been moderated");
		}

		// Delete photo
		await this.db.delete(photos).where(eq(photos.id, photoId));

		return { success: true, message: "Photo deleted successfully" };
	}

	async getUserPhotos(
		userId: string,
		competitionId?: string,
		categoryId?: string,
	) {
		let query = this.db
			.select({
				id: photos.id,
				title: photos.title,
				description: photos.description,
				filePath: photos.filePath,
				status: photos.status,
				categoryId: photos.categoryId,
				categoryName: categories.name,
				dateTaken: photos.dateTaken,
				location: photos.location,
				cameraInfo: photos.cameraInfo,
				settings: photos.settings,
				createdAt: photos.createdAt,
				rejectionReason: photos.rejectionReason,
			})
			.from(photos)
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.where(eq(photos.userId, userId));

		if (competitionId) {
			query = query.where(
				and(eq(photos.userId, userId), eq(photos.competitionId, competitionId)),
			);
		}

		if (categoryId) {
			query = query.where(
				and(eq(photos.userId, userId), eq(photos.categoryId, categoryId)),
			);
		}

		const userPhotos = await query.orderBy(desc(photos.createdAt));

		return {
			photos: userPhotos,
		};
	}

	async getPhotoById(photoId: string, userId: string) {
		const photo = await this.db
			.select({
				id: photos.id,
				title: photos.title,
				description: photos.description,
				filePath: photos.filePath,
				status: photos.status,
				categoryId: photos.categoryId,
				categoryName: categories.name,
				dateTaken: photos.dateTaken,
				location: photos.location,
				cameraInfo: photos.cameraInfo,
				settings: photos.settings,
				userId: photos.userId,
				createdAt: photos.createdAt,
				rejectionReason: photos.rejectionReason,
			})
			.from(photos)
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.where(eq(photos.id, photoId))
			.get();

		if (!photo) {
			return null;
		}

		if (photo.userId !== userId) {
			throw new Error("You can only view your own photos");
		}

		return photo;
	}

	async getUserSubmissionCounts(userId: string, competitionId?: string) {
		let query = this.db
			.select({
				categoryId: photos.categoryId,
				categoryName: categories.name,
				count: count(),
				maxPhotosPerUser: categories.maxPhotosPerUser,
			})
			.from(photos)
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.where(eq(photos.userId, userId))
			.groupBy(photos.categoryId, categories.name, categories.maxPhotosPerUser);

		if (competitionId) {
			query = query.where(
				and(eq(photos.userId, userId), eq(photos.competitionId, competitionId)),
			);
		}

		const counts = await query;

		// Convert to a more usable format
		const submissionCounts: Record<string, number> = {};
		const limits: Record<string, number> = {};

		for (const item of counts) {
			submissionCounts[item.categoryId] = item.count;
			limits[item.categoryId] = item.maxPhotosPerUser;
		}

		return {
			submissionCounts,
			limits,
		};
	}
}
