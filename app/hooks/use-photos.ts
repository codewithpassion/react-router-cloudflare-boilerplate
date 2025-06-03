import { trpc } from "~/lib/trpc";

export function usePhotos() {
	return {
		// Get user's photos
		useUserPhotos: (params: { competitionId?: string; categoryId?: string }) =>
			trpc.photo.getUserPhotos.useQuery(params),

		// Get photo by ID for editing
		usePhotoById: (id: string) =>
			trpc.photo.getById.useQuery({ id }, { enabled: !!id }),

		// Get submission counts
		useSubmissionCounts: (competitionId?: string) =>
			trpc.photo.getSubmissionCounts.useQuery(
				{ competitionId },
				{ staleTime: 5 * 60 * 1000 }, // Counts are relatively stable
			),

		// Mutations
		useUpload: () => trpc.photo.upload.useMutation(),
		useUploadBase64: () => trpc.photo.uploadBase64.useMutation(),
		useCreateFromUpload: () => trpc.photo.createFromUpload.useMutation(),
		useUpdate: () => trpc.photo.update.useMutation(),
		useDelete: () => trpc.photo.delete.useMutation(),
	};
}

// Utility functions for file handling
export function convertFileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix (e.g., "data:image/jpeg;base64,")
			const base64 = result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

export function validatePhotoFile(file: File): {
	valid: boolean;
	error?: string;
} {
	// File type validation
	const allowedTypes = ["image/jpeg", "image/png"];
	if (!allowedTypes.includes(file.type)) {
		return { valid: false, error: "Only JPEG and PNG files are allowed" };
	}

	// File size validation (10MB)
	const maxSize = 10 * 1024 * 1024;
	if (file.size > maxSize) {
		return { valid: false, error: "File size cannot exceed 10MB" };
	}

	return { valid: true };
}
