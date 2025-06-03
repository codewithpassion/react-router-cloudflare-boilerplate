export interface CompressionOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number; // 0.1 to 1.0
	format?: "jpeg" | "webp" | "png";
}

export interface ImageDimensions {
	width: number;
	height: number;
}

export function compressImage(
	file: File,
	options: CompressionOptions = {},
): Promise<File> {
	const {
		maxWidth = 1920,
		maxHeight = 1080,
		quality = 0.8,
		format = "jpeg",
	} = options;

	return new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const img = new Image();

		if (!ctx) {
			reject(new Error("Could not get canvas context"));
			return;
		}

		img.onload = () => {
			// Calculate new dimensions maintaining aspect ratio
			const { width, height } = calculateDimensions(
				img.width,
				img.height,
				maxWidth,
				maxHeight,
			);

			canvas.width = width;
			canvas.height = height;

			// Draw and compress
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (blob) {
						const compressedFile = new File([blob], file.name, {
							type: `image/${format}`,
							lastModified: Date.now(),
						});
						resolve(compressedFile);
					} else {
						reject(new Error("Compression failed"));
					}
				},
				`image/${format}`,
				quality,
			);
		};

		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = URL.createObjectURL(file);
	});
}

export function calculateDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number,
): ImageDimensions {
	let { width, height } = { width: originalWidth, height: originalHeight };

	// If image is smaller than max dimensions, return original
	if (width <= maxWidth && height <= maxHeight) {
		return { width, height };
	}

	// Calculate aspect ratio
	const aspectRatio = width / height;

	// Scale down to fit within max dimensions
	if (width > maxWidth) {
		width = maxWidth;
		height = width / aspectRatio;
	}

	if (height > maxHeight) {
		height = maxHeight;
		width = height * aspectRatio;
	}

	return {
		width: Math.round(width),
		height: Math.round(height),
	};
}

export function generatePreview(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (typeof result === "string") {
				resolve(result);
			} else {
				reject(new Error("Failed to generate preview"));
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

export function generateThumbnail(file: File, size = 200): Promise<string> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const img = new Image();

		if (!ctx) {
			reject(new Error("Could not get canvas context"));
			return;
		}

		img.onload = () => {
			canvas.width = size;
			canvas.height = size;

			// Calculate crop to center square
			const minDim = Math.min(img.width, img.height);
			const sx = (img.width - minDim) / 2;
			const sy = (img.height - minDim) / 2;

			ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
			resolve(canvas.toDataURL("image/jpeg", 0.8));
		};

		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = URL.createObjectURL(file);
	});
}

export function convertFileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix (data:image/jpeg;base64,)
			const base64 = result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = () =>
			reject(new Error("Failed to convert file to base64"));
		reader.readAsDataURL(file);
	});
}

export function validateImageFile(file: File): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	const maxSize = 10 * 1024 * 1024; // 10MB
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

	// Check file type
	if (!allowedTypes.includes(file.type)) {
		errors.push(
			"Invalid file type. Please upload JPEG, PNG, or WebP images only.",
		);
	}

	// Check file size
	if (file.size > maxSize) {
		errors.push(
			`File size too large. Maximum size allowed is ${maxSize / 1024 / 1024}MB.`,
		);
	}

	// Check if file is empty
	if (file.size === 0) {
		errors.push("File is empty.");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function getImageDimensions(file: File): Promise<ImageDimensions> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
			});
		};
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = URL.createObjectURL(file);
	});
}
