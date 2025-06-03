import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Competitions table
export const competitions = sqliteTable(
	"competitions",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		startDate: integer("start_date", { mode: "timestamp" }).notNull(),
		endDate: integer("end_date", { mode: "timestamp" }).notNull(),
		votingStartDate: integer("voting_start_date", { mode: "timestamp" }),
		votingEndDate: integer("voting_end_date", { mode: "timestamp" }),
		status: text("status", { enum: ["draft", "open", "voting", "closed"] })
			.notNull()
			.default("draft"),
		maxPhotosPerUser: integer("max_photos_per_user").notNull().default(5),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		statusIdx: index("competitions_status_idx").on(table.status),
		startDateIdx: index("competitions_start_date_idx").on(table.startDate),
	}),
);

// Categories table
export const categories = sqliteTable(
	"categories",
	{
		id: text("id").primaryKey(),
		competitionId: text("competition_id")
			.notNull()
			.references(() => competitions.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		maxPhotosPerUser: integer("max_photos_per_user").notNull().default(3),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		competitionIdx: index("categories_competition_idx").on(table.competitionId),
	}),
);

// Photos table
export const photos = sqliteTable(
	"photos",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(), // References user table from auth
		competitionId: text("competition_id")
			.notNull()
			.references(() => competitions.id, { onDelete: "cascade" }),
		categoryId: text("category_id")
			.notNull()
			.references(() => categories.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description").notNull(),
		filePath: text("file_path").notNull(),
		fileSize: integer("file_size").notNull(),
		mimeType: text("mime_type").notNull(),
		dateTaken: integer("date_taken", { mode: "timestamp" }).notNull(),
		location: text("location").notNull(),
		cameraInfo: text("camera_info"),
		settings: text("settings"),
		status: text("status", { enum: ["pending", "approved", "rejected"] })
			.notNull()
			.default("pending"),
		rejectionReason: text("rejection_reason"),
		approvedBy: text("approved_by"), // References user table
		approvedAt: integer("approved_at", { mode: "timestamp" }),
		rejectedBy: text("rejected_by"), // References user table
		rejectedAt: integer("rejected_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		userIdx: index("photos_user_idx").on(table.userId),
		competitionIdx: index("photos_competition_idx").on(table.competitionId),
		categoryIdx: index("photos_category_idx").on(table.categoryId),
		statusIdx: index("photos_status_idx").on(table.status),
		userCategoryIdx: index("photos_user_category_idx").on(
			table.userId,
			table.categoryId,
		),
	}),
);

// Votes table
export const votes = sqliteTable(
	"votes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(), // References user table from auth
		photoId: text("photo_id")
			.notNull()
			.references(() => photos.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		userPhotoIdx: index("votes_user_photo_idx").on(table.userId, table.photoId),
		photoIdx: index("votes_photo_idx").on(table.photoId),
		userIdx: index("votes_user_idx").on(table.userId),
	}),
);

// Reports table
export const reports = sqliteTable(
	"reports",
	{
		id: text("id").primaryKey(),
		reporterId: text("reporter_id").notNull(), // References user table from auth
		photoId: text("photo_id")
			.notNull()
			.references(() => photos.id, { onDelete: "cascade" }),
		reason: text("reason", {
			enum: ["inappropriate", "spam", "offensive", "copyright", "other"],
		}).notNull(),
		description: text("description"),
		status: text("status", { enum: ["pending", "resolved", "dismissed"] })
			.notNull()
			.default("pending"),
		adminNotes: text("admin_notes"),
		resolvedBy: text("resolved_by"), // References user table (admin)
		resolvedAt: integer("resolved_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		reporterIdx: index("reports_reporter_idx").on(table.reporterId),
		photoIdx: index("reports_photo_idx").on(table.photoId),
		statusIdx: index("reports_status_idx").on(table.status),
	}),
);

// Relations
export const competitionsRelations = relations(competitions, ({ many }) => ({
	categories: many(categories),
	photos: many(photos),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	competition: one(competitions, {
		fields: [categories.competitionId],
		references: [competitions.id],
	}),
	photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
	competition: one(competitions, {
		fields: [photos.competitionId],
		references: [competitions.id],
	}),
	category: one(categories, {
		fields: [photos.categoryId],
		references: [categories.id],
	}),
	votes: many(votes),
	reports: many(reports),
}));

export const votesRelations = relations(votes, ({ one }) => ({
	photo: one(photos, {
		fields: [votes.photoId],
		references: [photos.id],
	}),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
	photo: one(photos, {
		fields: [reports.photoId],
		references: [photos.id],
	}),
}));
