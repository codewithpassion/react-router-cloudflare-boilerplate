import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { DatabaseType } from "../database/db";
import { categories, photos, votes } from "../database/schema";
import {
	AlreadyVotedError,
	CannotVoteOwnPhotoError,
	PhotoNotApprovedException,
	PhotoNotFoundError,
} from "../errors";
import { generateVoteId } from "../utils/id";

export class VotingService {
	constructor(private db: DatabaseType) {}

	async castVote(
		userId: string,
		photoId: string,
	): Promise<{
		success: boolean;
		voteCount: number;
		error?: string;
	}> {
		// Check if photo exists and is approved
		const photo = await this.db
			.select({
				id: photos.id,
				userId: photos.userId,
				status: photos.status,
			})
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		if (!photo) {
			throw new PhotoNotFoundError();
		}

		if (photo.status !== "approved") {
			throw new PhotoNotApprovedException();
		}

		// Check if user is trying to vote on their own photo
		if (photo.userId === userId) {
			throw new CannotVoteOwnPhotoError();
		}

		// Check if user has already voted
		const existingVote = await this.db
			.select()
			.from(votes)
			.where(and(eq(votes.userId, userId), eq(votes.photoId, photoId)))
			.get();

		if (existingVote) {
			throw new AlreadyVotedError();
		}

		// Cast vote
		await this.db.insert(votes).values({
			id: generateVoteId(),
			userId,
			photoId,
			createdAt: new Date(),
		});

		// Get updated vote count
		const voteCount = await this.getPhotoVoteCount(photoId);

		return { success: true, voteCount };
	}

	async getPhotoVoteCount(photoId: string): Promise<number> {
		const result = await this.db
			.select({ count: count() })
			.from(votes)
			.where(eq(votes.photoId, photoId))
			.get();

		return result.count;
	}

	async getUserVoteStatus(
		userId: string | null,
		photoId: string,
	): Promise<{
		voteCount: number;
		userHasVoted: boolean;
		canVote: boolean;
	}> {
		const voteCount = await this.getPhotoVoteCount(photoId);

		if (!userId) {
			return {
				voteCount,
				userHasVoted: false,
				canVote: false,
			};
		}

		// Check if user has voted
		const userVote = await this.db
			.select()
			.from(votes)
			.where(and(eq(votes.userId, userId), eq(votes.photoId, photoId)))
			.get();

		// Check if user owns the photo
		const photo = await this.db
			.select({ userId: photos.userId, status: photos.status })
			.from(photos)
			.where(eq(photos.id, photoId))
			.get();

		const canVote =
			photo &&
			photo.status === "approved" &&
			photo.userId !== userId &&
			!userVote;

		return {
			voteCount,
			userHasVoted: !!userVote,
			canVote: !!canVote,
		};
	}

	async getPhotosWithVotes(
		competitionId: string,
		filters: {
			categoryId?: string;
			sortBy?: "votes" | "date" | "title";
			order?: "asc" | "desc";
			limit?: number;
			offset?: number;
		} = {},
		userId?: string,
	) {
		const {
			categoryId,
			sortBy = "votes",
			order = "desc",
			limit = 20,
			offset = 0,
		} = filters;

		// Build the base query with vote counts
		let query = this.db
			.select({
				id: photos.id,
				title: photos.title,
				description: photos.description,
				filePath: photos.filePath,
				dateTaken: photos.dateTaken,
				location: photos.location,
				cameraInfo: photos.cameraInfo,
				settings: photos.settings,
				categoryId: photos.categoryId,
				categoryName: categories.name,
				photographerId: photos.userId,
				voteCount: sql<number>`COUNT(${votes.id})`.as("voteCount"),
			})
			.from(photos)
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.leftJoin(votes, eq(photos.id, votes.photoId))
			.where(
				and(
					eq(photos.competitionId, competitionId),
					eq(photos.status, "approved"),
					categoryId ? eq(photos.categoryId, categoryId) : undefined,
				),
			)
			.groupBy(photos.id, categories.name);

		// Apply sorting
		switch (sortBy) {
			case "votes":
				query =
					order === "desc"
						? query.orderBy(
								desc(sql`COUNT(${votes.id})`),
								desc(photos.createdAt),
							)
						: query.orderBy(
								asc(sql`COUNT(${votes.id})`),
								asc(photos.createdAt),
							);
				break;
			case "date":
				query =
					order === "desc"
						? query.orderBy(desc(photos.createdAt))
						: query.orderBy(asc(photos.createdAt));
				break;
			case "title":
				query =
					order === "desc"
						? query.orderBy(desc(photos.title))
						: query.orderBy(asc(photos.title));
				break;
		}

		const results = await query.limit(limit).offset(offset);

		// If user is authenticated, get their vote status for each photo
		const photosWithUserStatus = await Promise.all(
			results.map(async (photo) => {
				let userHasVoted = false;
				let canVote = false;

				if (userId) {
					const userVote = await this.db
						.select()
						.from(votes)
						.where(and(eq(votes.userId, userId), eq(votes.photoId, photo.id)))
						.get();

					userHasVoted = !!userVote;
					canVote = photo.photographerId !== userId && !userHasVoted;
				}

				return {
					...photo,
					userHasVoted,
					canVote,
					photographer: {
						id: photo.photographerId,
					},
				};
			}),
		);

		return {
			photos: photosWithUserStatus,
			total: results.length,
			limit,
			offset,
		};
	}

	async getUserVoteHistory(userId: string, competitionId?: string) {
		let query = this.db
			.select({
				id: votes.id,
				photoId: votes.photoId,
				photoTitle: photos.title,
				categoryName: categories.name,
				votedAt: votes.createdAt,
			})
			.from(votes)
			.innerJoin(photos, eq(votes.photoId, photos.id))
			.innerJoin(categories, eq(photos.categoryId, categories.id))
			.where(eq(votes.userId, userId));

		if (competitionId) {
			query = query.where(
				and(eq(votes.userId, userId), eq(photos.competitionId, competitionId)),
			);
		}

		const results = await query.orderBy(desc(votes.createdAt));

		return {
			votes: results,
			totalVotes: results.length,
		};
	}

	async getTopPhotos(competitionId: string, categoryId?: string, limit = 10) {
		return this.getPhotosWithVotes(competitionId, {
			categoryId,
			sortBy: "votes",
			order: "desc",
			limit,
		});
	}

	async getVotingStats(competitionId: string) {
		// Get total votes in competition
		const totalVotes = await this.db
			.select({ count: count() })
			.from(votes)
			.innerJoin(photos, eq(votes.photoId, photos.id))
			.where(eq(photos.competitionId, competitionId))
			.get();

		// Get votes per category
		const categoryStats = await this.db
			.select({
				categoryId: categories.id,
				categoryName: categories.name,
				voteCount: sql<number>`COUNT(${votes.id})`,
				photoCount: sql<number>`COUNT(DISTINCT ${photos.id})`,
			})
			.from(categories)
			.leftJoin(
				photos,
				and(
					eq(categories.id, photos.categoryId),
					eq(photos.status, "approved"),
				),
			)
			.leftJoin(votes, eq(photos.id, votes.photoId))
			.where(eq(categories.competitionId, competitionId))
			.groupBy(categories.id, categories.name);

		return {
			totalVotes: totalVotes.count,
			categories: categoryStats,
		};
	}
}
