import { z } from "zod";

// Common ID schema for all entities
export const idSchema = z.string().min(1);

// Date string schema for ISO date strings
export const dateStringSchema = z.string().datetime();

// Pagination schema
export const paginationSchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
});

// Report reason schema
export const reportReasonSchema = z.enum([
	"inappropriate",
	"spam",
	"offensive",
	"copyright",
	"other",
]);

// Report status schema
export const reportStatusSchema = z.enum(["pending", "resolved", "dismissed"]);

// Photo status schema
export const photoStatusSchema = z.enum(["pending", "approved", "rejected"]);

// User role schema
export const userRoleSchema = z.enum(["user", "admin"]);

// Competition status schema
export const competitionStatusSchema = z.enum([
	"draft",
	"open",
	"voting",
	"closed",
]);

// File type validation
export const imageFileSchema = z.object({
	name: z.string(),
	size: z.number().max(10 * 1024 * 1024), // 10MB max
	type: z.enum(["image/jpeg", "image/png"]),
});

// Email schema
export const emailSchema = z.string().email();

// Password schema (for user creation/updates)
export const passwordSchema = z.string().min(8).max(128);
