import { randomBytes } from "crypto";

// Generate a random ID with optional prefix
export function generateId(prefix?: string): string {
	const id = randomBytes(12).toString("hex");
	return prefix ? `${prefix}_${id}` : id;
}

// Generate competition ID
export function generateCompetitionId(): string {
	return generateId("comp");
}

// Generate category ID
export function generateCategoryId(): string {
	return generateId("cat");
}

// Generate photo ID
export function generatePhotoId(): string {
	return generateId("photo");
}

// Generate vote ID
export function generateVoteId(): string {
	return generateId("vote");
}

// Generate report ID
export function generateReportId(): string {
	return generateId("report");
}
