import { and, count, desc, eq, sql } from "drizzle-orm";
import type { DatabaseType } from "../database/db";
import { categories, photos, reports } from "../database/schema";
import { PhotoAlreadyModeratedError, PhotoNotFoundError } from "../errors";
import { generateReportId } from "../utils/id";

export class ModerationService {
	constructor(private db: DatabaseType) {}

	async getPendingPhotos(
		filters: {
			competitionId?: string;
			limit?: number;
			offset?: number;
		} = {},
	) {
		const { competitionId, limit = 20, offset = 0 } = filters;

		let query = this.db
			.select({
				id: photos.id,
				title: photos.title,
				description: photos.description,
				filePath: photos.filePath,
				categoryName: categories.name,
				photographerId: photos.userId,
				submittedAt: photos.createdAt,
				metadata: {
					dateTaken: photos.dateTaken,
					location: photos.location,
					cameraInfo: photos.cameraInfo,
					settings: photos.settings,
				},
			})
			.from(photos)
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.where(eq(photos.status, "pending"));

		if (competitionId) {
			query = query.where(
				and(
					eq(photos.status, "pending"),
					eq(photos.competitionId, competitionId),
				),
			);
		}

		const results = await query
			.orderBy(desc(photos.createdAt))
			.limit(limit)
			.offset(offset);

		// Get total count
		let countQuery = this.db
			.select({ count: count() })
			.from(photos)
			.where(eq(photos.status, "pending"));

		if (competitionId) {
			countQuery = countQuery.where(
				and(
					eq(photos.status, "pending"),
					eq(photos.competitionId, competitionId),
				),
			);
		}

		const totalResult = await countQuery.get();

		return {
			photos: results.map((photo) => ({
				id: photo.id,
				title: photo.title,
				description: photo.description,
				filePath: photo.filePath,
				categoryName: photo.categoryName,
				photographer: {
					id: photo.photographerId,
				},
				submittedAt: photo.submittedAt,
				metadata: photo.metadata,
			})),
			total: totalResult.count,
			limit,
			offset,
		};
	}

	async approvePhoto(photoId: string, adminId: string) {
		const photo = await this.db
			.select()
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!photo) {
			throw new PhotoNotFoundError();
		}

		if (photo.status !== "pending") {
			throw new PhotoAlreadyModeratedError();
		}

		const now = new Date();
		const updatedPhoto = await this.db
			.update(photos)
			.set({
				status: "approved",
				approvedBy: adminId,
				approvedAt: now,
				updatedAt: now,
			})
			.where(eq(photos.id, photoId))
			.returning()
			.get();

		return {
			id: updatedPhoto.id,
			status: updatedPhoto.status,
			approvedBy: updatedPhoto.approvedBy,
			approvedAt: updatedPhoto.approvedAt,
		};
	}

	async rejectPhoto(photoId: string, adminId: string, reason: string) {
		const photo = await this.db
			.select()
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!photo) {
			throw new PhotoNotFoundError();
		}

		if (photo.status !== "pending") {
			throw new PhotoAlreadyModeratedError();
		}

		const now = new Date();
		const updatedPhoto = await this.db
			.update(photos)
			.set({
				status: "rejected",
				rejectionReason: reason,
				rejectedBy: adminId,
				rejectedAt: now,
				updatedAt: now,
			})
			.where(eq(photos.id, photoId))
			.returning()
			.get();

		return {
			id: updatedPhoto.id,
			status: updatedPhoto.status,
			rejectionReason: updatedPhoto.rejectionReason,
			rejectedBy: updatedPhoto.rejectedBy,
			rejectedAt: updatedPhoto.rejectedAt,
		};
	}

	async deletePhoto(photoId: string, adminId: string, reason: string) {
		const photo = await this.db
			.select()
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!photo) {
			throw new PhotoNotFoundError();
		}

		// Delete the photo (this will also cascade delete votes and reports)
		await this.db.delete(photos).where(eq(photos.id, photoId));

		return {
			success: true,
			message: "Photo deleted successfully",
		};
	}

	async bulkPhotoAction(
		photoIds: string[],
		action: "approve" | "reject" | "delete",
		adminId: string,
		reason?: string,
	) {
		const results = [];
		let processed = 0;
		let failed = 0;

		for (const photoId of photoIds) {
			try {
				let result:
					| { status?: string; success?: boolean; message?: string }
					| undefined;
				switch (action) {
					case "approve":
						result = await this.approvePhoto(photoId, adminId);
						break;
					case "reject":
						if (!reason) throw new Error("Reason required for rejection");
						result = await this.rejectPhoto(photoId, adminId, reason);
						break;
					case "delete":
						if (!reason) throw new Error("Reason required for deletion");
						result = await this.deletePhoto(photoId, adminId, reason);
						break;
				}

				results.push({
					photoId,
					status:
						action === "delete" ? "deleted" : result?.status || "processed",
				});
				processed++;
			} catch (error) {
				results.push({
					photoId,
					error: error.message,
				});
				failed++;
			}
		}

		return {
			success: true,
			processed,
			failed,
			results,
		};
	}

	async createReport(data: {
		reporterId: string;
		photoId: string;
		reason: string;
		description?: string;
	}) {
		// Check if photo exists
		const photo = await this.db
			.select()
			.from(photos)
			.where(eq(photos.id, data.photoId))
			.get();

		if (!photo) {
			throw new PhotoNotFoundError();
		}

		// Check if user already reported this photo
		const existingReport = await this.db
			.select()
			.from(reports)
			.where(
				and(
					eq(reports.reporterId, data.reporterId),
					eq(reports.photoId, data.photoId),
				),
			)
			.get();

		if (existingReport) {
			throw new Error("You have already reported this photo");
		}

		const now = new Date();
		const report = await this.db
			.insert(reports)
			.values({
				id: generateReportId(),
				reporterId: data.reporterId,
				photoId: data.photoId,
				reason: data.reason as
					| "inappropriate"
					| "spam"
					| "offensive"
					| "copyright"
					| "other",
				description: data.description,
				status: "pending",
				createdAt: now,
				updatedAt: now,
			})
			.returning()
			.get();

		return {
			id: report.id,
			status: report.status,
			message: "Report submitted successfully",
		};
	}

	async getUserReports(userId: string) {
		const userReports = await this.db
			.select({
				id: reports.id,
				photoId: reports.photoId,
				photoTitle: photos.title,
				reason: reports.reason,
				status: reports.status,
				reportedAt: reports.createdAt,
			})
			.from(reports)
			.innerJoin(photos, eq(reports.photoId, photos.id))
			.where(eq(reports.reporterId, userId))
			.orderBy(desc(reports.createdAt));

		return {
			reports: userReports,
		};
	}

	async getReports(
		filters: {
			status?: string;
			limit?: number;
			offset?: number;
		} = {},
	) {
		const { status, limit = 20, offset = 0 } = filters;

		let query = this.db
			.select({
				id: reports.id,
				photo: {
					id: photos.id,
					title: photos.title,
					filePath: photos.filePath,
				},
				reporter: {
					id: reports.reporterId,
				},
				reason: reports.reason,
				description: reports.description,
				status: reports.status,
				reportedAt: reports.createdAt,
			})
			.from(reports)
			.innerJoin(photos, eq(reports.photoId, photos.id));

		if (status) {
			query = query.where(
				eq(reports.status, status as "pending" | "resolved" | "dismissed"),
			);
		}

		const results = await query
			.orderBy(desc(reports.createdAt))
			.limit(limit)
			.offset(offset);

		// Get total count
		let countQuery = this.db.select({ count: count() }).from(reports);

		if (status) {
			countQuery = countQuery.where(
				eq(reports.status, status as "pending" | "resolved" | "dismissed"),
			);
		}

		const totalResult = await countQuery.get();

		return {
			reports: results,
			total: totalResult.count,
			limit,
			offset,
		};
	}

	async resolveReport(
		reportId: string,
		adminId: string,
		resolution: {
			action: "resolved" | "dismissed";
			adminNotes?: string;
			photoAction?: "approve" | "reject" | "delete";
			photoActionReason?: string;
		},
	) {
		const report = await this.db
			.select()
			.from(reports)
			.where(eq(reports.id, reportId))
			.get();

		if (!report) {
			throw new Error("Report not found");
		}

		if (report.status !== "pending") {
			throw new Error("Report has already been resolved");
		}

		// If there's a photo action, perform it first
		if (resolution.photoAction) {
			switch (resolution.photoAction) {
				case "approve":
					await this.approvePhoto(report.photoId, adminId);
					break;
				case "reject":
					await this.rejectPhoto(
						report.photoId,
						adminId,
						resolution.photoActionReason || "Content moderation",
					);
					break;
				case "delete":
					await this.deletePhoto(
						report.photoId,
						adminId,
						resolution.photoActionReason || "Content moderation",
					);
					break;
			}
		}

		// Update the report
		const now = new Date();
		const updatedReport = await this.db
			.update(reports)
			.set({
				status: resolution.action,
				adminNotes: resolution.adminNotes,
				resolvedBy: adminId,
				resolvedAt: now,
				updatedAt: now,
			})
			.where(eq(reports.id, reportId))
			.returning()
			.get();

		return {
			id: updatedReport.id,
			status: updatedReport.status,
			resolvedBy: updatedReport.resolvedBy,
			resolvedAt: updatedReport.resolvedAt,
		};
	}

	async getModerationStats() {
		// Get overall photo stats
		const photoStats = await this.db
			.select({
				status: photos.status,
				count: count(),
			})
			.from(photos)
			.groupBy(photos.status);

		// Get report stats
		const reportStats = await this.db
			.select({
				status: reports.status,
				count: count(),
			})
			.from(reports)
			.groupBy(reports.status);

		return {
			photos: photoStats,
			reports: reportStats,
		};
	}
}
