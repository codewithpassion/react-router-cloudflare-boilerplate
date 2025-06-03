import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FileDropzone } from "~/components/shared/file-dropzone";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { usePhotos } from "~/hooks/use-photos";
import { cn } from "~/lib/utils";
import {
	extractExifData,
	formatCameraInfo,
	formatSettings,
} from "~/utils/exif-reader";
import {
	compressImage,
	generatePreview,
	validateImageFile,
} from "~/utils/image-processing";
import {
	PhotoMetadataForm,
	type PhotoMetadataFormData,
} from "./photo-metadata-form";
import { type UploadFile, UploadProgress } from "./upload-progress";

interface PhotoUploadProps {
	competitionId: string;
	categoryId?: string;
	onSuccess?: (photos: any[]) => void;
	onError?: (error: string) => void;
	maxPhotos?: number;
	className?: string;
}

type UploadStep = "select" | "metadata" | "uploading" | "complete";

interface PhotoWithMetadata extends UploadFile {
	metadata?: PhotoMetadataFormData;
	exifData?: any;
}

export function PhotoUpload({
	competitionId,
	categoryId,
	onSuccess,
	onError,
	maxPhotos = 3,
	className,
}: PhotoUploadProps) {
	const [currentStep, setCurrentStep] = useState<UploadStep>("select");
	const [selectedFiles, setSelectedFiles] = useState<PhotoWithMetadata[]>([]);
	const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
	const [completedPhotos, setCompletedPhotos] = useState<any[]>([]);

	const { useUploadBase64, useCreateFromUpload } = usePhotos();
	const uploadMutation = useUploadBase64();
	const createMutation = useCreateFromUpload();

	// Generate unique ID for files
	const generateFileId = () =>
		`file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	const handleFilesSelected = useCallback(
		async (files: File[]) => {
			const processedFiles: PhotoWithMetadata[] = [];

			for (const file of files) {
				const validation = validateImageFile(file);
				if (!validation.isValid) {
					onError?.(validation.errors.join(", "));
					continue;
				}

				try {
					// Generate preview
					const preview = await generatePreview(file);

					// Extract EXIF data
					const exifData = await extractExifData(file);

					const processedFile: PhotoWithMetadata = {
						id: generateFileId(),
						file,
						preview,
						progress: 0,
						status: "pending",
						exifData,
					};

					processedFiles.push(processedFile);
				} catch (error) {
					console.error("Error processing file:", error);
					onError?.(`Error processing ${file.name}`);
				}
			}

			setSelectedFiles(processedFiles);
			if (processedFiles.length > 0) {
				setCurrentStep("metadata");
				setCurrentPhotoIndex(0);
			}
		},
		[onError],
	);

	const handleMetadataSubmit = useCallback(
		async (metadata: PhotoMetadataFormData) => {
			const currentPhoto = selectedFiles[currentPhotoIndex];
			if (!currentPhoto) return;

			// Update the current photo with metadata
			const updatedFiles = [...selectedFiles];
			updatedFiles[currentPhotoIndex] = {
				...currentPhoto,
				metadata,
			};
			setSelectedFiles(updatedFiles);

			// Check if this is the last photo
			if (currentPhotoIndex === selectedFiles.length - 1) {
				// All metadata collected, start uploading
				setCurrentStep("uploading");
				await startUploading(updatedFiles);
			} else {
				// Move to next photo
				setCurrentPhotoIndex(currentPhotoIndex + 1);
			}
		},
		[selectedFiles, currentPhotoIndex],
	);

	const startUploading = async (photosToUpload: PhotoWithMetadata[]) => {
		try {
			const uploadedPhotos: any[] = [];

			for (let i = 0; i < photosToUpload.length; i++) {
				const photo = photosToUpload[i];
				if (!photo.metadata) continue;

				// Update status to uploading
				setSelectedFiles((prev) =>
					prev.map((f, idx) =>
						idx === i ? { ...f, status: "uploading" as const, progress: 0 } : f,
					),
				);

				try {
					// Compress image
					const compressedFile = await compressImage(photo.file, {
						maxWidth: 1920,
						maxHeight: 1080,
						quality: 0.8,
					});

					// Update progress
					setSelectedFiles((prev) =>
						prev.map((f, idx) => (idx === i ? { ...f, progress: 25 } : f)),
					);

					// Convert to base64
					const base64 = await convertFileToBase64(compressedFile);

					setSelectedFiles((prev) =>
						prev.map((f, idx) => (idx === i ? { ...f, progress: 50 } : f)),
					);

					// Upload file
					const uploadResult = await uploadMutation.mutateAsync({
						filename: photo.file.name,
						content: base64,
						contentType: photo.file.type,
					});

					setSelectedFiles((prev) =>
						prev.map((f, idx) =>
							idx === i
								? { ...f, progress: 75, status: "processing" as const }
								: f,
						),
					);

					// Create photo record
					const photoRecord = await createMutation.mutateAsync({
						title: photo.metadata.title,
						description: photo.metadata.description,
						filePath: uploadResult.url,
						competitionId,
						categoryId: categoryId || "",
						dateTaken: photo.metadata.dateTaken,
						location: photo.metadata.location,
						cameraInfo: photo.metadata.cameraInfo,
						settings: photo.metadata.settings,
					});

					// Update status to completed
					setSelectedFiles((prev) =>
						prev.map((f, idx) =>
							idx === i
								? {
										...f,
										progress: 100,
										status: "completed" as const,
										uploadedUrl: uploadResult.url,
									}
								: f,
						),
					);

					uploadedPhotos.push(photoRecord);
				} catch (error) {
					console.error("Upload error:", error);
					setSelectedFiles((prev) =>
						prev.map((f, idx) =>
							idx === i
								? {
										...f,
										status: "error" as const,
										error:
											error instanceof Error ? error.message : "Upload failed",
									}
								: f,
						),
					);
				}
			}

			setCompletedPhotos(uploadedPhotos);
			setCurrentStep("complete");
			onSuccess?.(uploadedPhotos);
		} catch (error) {
			console.error("Upload process error:", error);
			onError?.(error instanceof Error ? error.message : "Upload failed");
		}
	};

	const convertFileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				resolve(result.split(",")[1]); // Remove data URL prefix
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const handleRetry = async (fileId: string) => {
		const fileIndex = selectedFiles.findIndex((f) => f.id === fileId);
		if (fileIndex === -1) return;

		// Reset file status and retry upload
		setSelectedFiles((prev) =>
			prev.map((f, idx) =>
				idx === fileIndex
					? { ...f, status: "pending" as const, progress: 0, error: undefined }
					: f,
			),
		);

		// Restart upload for this specific file
		const photosToRetry = selectedFiles.filter((_, idx) => idx === fileIndex);
		await startUploading(photosToRetry);
	};

	const handleRemoveFile = (fileId: string) => {
		setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));

		if (selectedFiles.length === 1) {
			// If removing the last file, go back to select step
			setCurrentStep("select");
		} else if (currentPhotoIndex >= selectedFiles.length - 1) {
			// If removing current photo and it's the last one, go to previous
			setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1));
		}
	};

	const goToPreviousPhoto = () => {
		if (currentPhotoIndex > 0) {
			setCurrentPhotoIndex(currentPhotoIndex - 1);
		}
	};

	const goToNextPhoto = () => {
		if (currentPhotoIndex < selectedFiles.length - 1) {
			setCurrentPhotoIndex(currentPhotoIndex + 1);
		}
	};

	const resetUpload = () => {
		setCurrentStep("select");
		setSelectedFiles([]);
		setCurrentPhotoIndex(0);
		setCompletedPhotos([]);
	};

	const currentPhoto = selectedFiles[currentPhotoIndex];

	// Auto-populate metadata from EXIF
	const getAutoPopulatedMetadata = () => {
		if (!currentPhoto?.exifData) return {};

		return {
			dateTaken: currentPhoto.exifData.dateTaken
				? currentPhoto.exifData.dateTaken.toISOString().split("T")[0]
				: undefined,
			cameraInfo: formatCameraInfo(currentPhoto.exifData),
			settings: formatSettings(currentPhoto.exifData),
		};
	};

	return (
		<div className={cn("space-y-6", className)}>
			{/* Step Indicator */}
			<div className="flex items-center justify-center space-x-4">
				{["select", "metadata", "uploading", "complete"].map((step, index) => (
					<div key={step} className="flex items-center">
						<div
							className={cn(
								"flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
								currentStep === step
									? "border-blue-500 bg-blue-500 text-white"
									: index <
											["select", "metadata", "uploading", "complete"].indexOf(
												currentStep,
											)
										? "border-green-500 bg-green-500 text-white"
										: "border-gray-300 text-gray-500",
							)}
						>
							{index <
							["select", "metadata", "uploading", "complete"].indexOf(
								currentStep,
							) ? (
								<Check className="w-4 h-4" />
							) : (
								index + 1
							)}
						</div>
						{index < 3 && (
							<div
								className={cn(
									"w-12 h-0.5 mx-2",
									index <
										["select", "metadata", "uploading", "complete"].indexOf(
											currentStep,
										)
										? "bg-green-500"
										: "bg-gray-300",
								)}
							/>
						)}
					</div>
				))}
			</div>

			{/* Step Content */}
			{currentStep === "select" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="w-5 h-5" />
							Select Photos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<FileDropzone
							onFilesSelected={handleFilesSelected}
							multiple={maxPhotos > 1}
							maxFiles={maxPhotos}
							showPreview={true}
						/>
						<div className="mt-4 text-center text-sm text-gray-600">
							You can upload up to {maxPhotos} photo{maxPhotos === 1 ? "" : "s"}{" "}
							for this competition.
						</div>
					</CardContent>
				</Card>
			)}

			{currentStep === "metadata" && currentPhoto && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>
								Photo {currentPhotoIndex + 1} of {selectedFiles.length}
							</span>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={goToPreviousPhoto}
									disabled={currentPhotoIndex === 0}
								>
									<ArrowLeft className="w-4 h-4 mr-1" />
									Previous
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={goToNextPhoto}
									disabled={currentPhotoIndex === selectedFiles.length - 1}
								>
									Next
									<ArrowRight className="w-4 h-4 ml-1" />
								</Button>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PhotoMetadataForm
							photo={{
								...currentPhoto,
								preview: currentPhoto.preview!,
								...getAutoPopulatedMetadata(),
							}}
							competitionId={competitionId}
							categoryId={categoryId || ""}
							onSubmit={handleMetadataSubmit}
							onCancel={resetUpload}
						/>
					</CardContent>
				</Card>
			)}

			{currentStep === "uploading" && (
				<Card>
					<CardHeader>
						<CardTitle>Uploading Photos</CardTitle>
					</CardHeader>
					<CardContent>
						<UploadProgress
							files={selectedFiles}
							onRemove={handleRemoveFile}
							onRetry={handleRetry}
						/>
					</CardContent>
				</Card>
			)}

			{currentStep === "complete" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-green-600">
							<Check className="w-5 h-5" />
							Upload Complete!
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-gray-600">
							Your {completedPhotos.length} photo
							{completedPhotos.length === 1 ? " has" : "s have"} been
							successfully uploaded and submitted for review.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{completedPhotos.map((photo, index) => (
								<div key={index} className="border rounded-lg p-3">
									<img
										src={selectedFiles[index]?.preview || photo.filePath}
										alt={photo.title}
										className="w-full h-32 object-cover rounded mb-2"
									/>
									<h4 className="font-medium text-sm">{photo.title}</h4>
									<p className="text-xs text-gray-500">
										Status: Pending Review
									</p>
								</div>
							))}
						</div>

						<div className="flex justify-center">
							<Button onClick={resetUpload}>Upload More Photos</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
