import { TRPCError } from "@trpc/server";

// Custom error classes for business logic
export class PhotoNotFoundError extends TRPCError {
	constructor() {
		super({
			code: "NOT_FOUND",
			message: "Photo not found",
		});
	}
}

export class CompetitionNotFoundError extends TRPCError {
	constructor() {
		super({
			code: "NOT_FOUND",
			message: "Competition not found",
		});
	}
}

export class CategoryNotFoundError extends TRPCError {
	constructor() {
		super({
			code: "NOT_FOUND",
			message: "Category not found",
		});
	}
}

export class SubmissionLimitExceededError extends TRPCError {
	constructor(limit: number) {
		super({
			code: "BAD_REQUEST",
			message: `Maximum ${limit} photos allowed for this category`,
		});
	}
}

export class AlreadyVotedError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "You have already voted on this photo",
		});
	}
}

export class CannotVoteOwnPhotoError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "You cannot vote on your own photo",
		});
	}
}

export class PhotoNotApprovedException extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "Photo must be approved before voting",
		});
	}
}

export class CompetitionNotActiveError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "Competition is not currently active",
		});
	}
}

export class PhotoAlreadyModeratedError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "Photo has already been moderated",
		});
	}
}

export class InvalidFileTypeError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "Only JPEG and PNG files are allowed",
		});
	}
}

export class FileSizeExceededError extends TRPCError {
	constructor() {
		super({
			code: "BAD_REQUEST",
			message: "File size cannot exceed 10MB",
		});
	}
}
