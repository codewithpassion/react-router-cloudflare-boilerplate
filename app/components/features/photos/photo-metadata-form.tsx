import { Calendar, Camera, MapPin, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export interface PhotoMetadataFormData {
	title: string;
	description: string;
	dateTaken: string;
	location: string;
	cameraInfo?: string;
	settings?: string;
	tags?: string[];
}

interface PhotoMetadataFormProps {
	photo: {
		id?: string;
		file?: File;
		preview: string;
		title?: string;
		description?: string;
		dateTaken?: string;
		location?: string;
		cameraInfo?: string;
		settings?: string;
		tags?: string[];
	};
	competitionId: string;
	categoryId: string;
	onSubmit: (data: PhotoMetadataFormData) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
	autoPopulate?: boolean;
}

export function PhotoMetadataForm({
	photo,
	competitionId,
	categoryId,
	onSubmit,
	onCancel,
	isSubmitting = false,
	autoPopulate = true,
}: PhotoMetadataFormProps) {
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isValid },
	} = useForm<PhotoMetadataFormData>({
		defaultValues: {
			title: photo.title || "",
			description: photo.description || "",
			dateTaken: photo.dateTaken || new Date().toISOString().split("T")[0],
			location: photo.location || "",
			cameraInfo: photo.cameraInfo || "",
			settings: photo.settings || "",
			tags: photo.tags || [],
		},
		mode: "onChange",
	});

	const watchedDescription = watch("description");
	const descriptionLength = watchedDescription?.length || 0;

	const handleFormSubmit = (data: PhotoMetadataFormData) => {
		onSubmit(data);
	};

	return (
		<div className="space-y-6">
			{/* Photo Preview */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						<img
							src={photo.preview}
							alt="Preview"
							className="w-20 h-20 object-cover rounded-lg border"
						/>
						<div className="flex-1">
							<h3 className="font-medium">Photo Preview</h3>
							<p className="text-sm text-gray-600">
								{photo.file?.name || "Uploaded photo"}
							</p>
							{photo.file && (
								<p className="text-xs text-gray-500">
									{(photo.file.size / 1024 / 1024).toFixed(1)} MB
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Metadata Form */}
			<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Camera className="w-5 h-5" />
							Photo Details
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Title */}
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Title <span className="text-red-500">*</span>
							</label>
							<Input
								{...register("title", {
									required: "Photo title is required",
									maxLength: {
										value: 200,
										message: "Title cannot exceed 200 characters",
									},
									minLength: {
										value: 3,
										message: "Title must be at least 3 characters",
									},
								})}
								placeholder="Enter a descriptive title for your photo"
								className={cn(errors.title && "border-red-500")}
							/>
							{errors.title && (
								<p className="text-sm text-red-600">{errors.title.message}</p>
							)}
						</div>

						{/* Description */}
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Description <span className="text-red-500">*</span>
							</label>
							<Textarea
								{...register("description", {
									required: "Photo description is required",
									minLength: {
										value: 20,
										message: "Description must be at least 20 characters",
									},
									maxLength: {
										value: 500,
										message: "Description cannot exceed 500 characters",
									},
								})}
								placeholder="Describe your photo, the story behind it, or technical details..."
								rows={4}
								className={cn(errors.description && "border-red-500")}
							/>
							<div className="flex justify-between items-center">
								{errors.description && (
									<p className="text-sm text-red-600">
										{errors.description.message}
									</p>
								)}
								<p
									className={cn(
										"text-xs ml-auto",
										descriptionLength > 500
											? "text-red-500"
											: descriptionLength > 450
												? "text-yellow-500"
												: "text-gray-500",
									)}
								>
									{descriptionLength}/500
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Location and Date */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MapPin className="w-5 h-5" />
							Location & Time
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Date Taken */}
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Date Taken <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<Input
									type="date"
									{...register("dateTaken", {
										required: "Date taken is required",
									})}
									className={cn(errors.dateTaken && "border-red-500")}
								/>
								<Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							</div>
							{errors.dateTaken && (
								<p className="text-sm text-red-600">
									{errors.dateTaken.message}
								</p>
							)}
						</div>

						{/* Location */}
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Location <span className="text-red-500">*</span>
							</label>
							<Input
								{...register("location", {
									required: "Location is required",
									minLength: {
										value: 2,
										message: "Location must be at least 2 characters",
									},
								})}
								placeholder="City, Country or specific location"
								className={cn(errors.location && "border-red-500")}
							/>
							{errors.location && (
								<p className="text-sm text-red-600">
									{errors.location.message}
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Technical Details */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Settings className="w-5 h-5" />
							Technical Details (Optional)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Camera Info */}
						<div className="space-y-2">
							<label className="text-sm font-medium">Camera & Lens</label>
							<Input
								{...register("cameraInfo")}
								placeholder="e.g., Canon EOS R5, 24-70mm f/2.8"
							/>
							<p className="text-xs text-gray-500">
								Camera model and lens used (auto-filled from EXIF when
								available)
							</p>
						</div>

						{/* Settings */}
						<div className="space-y-2">
							<label className="text-sm font-medium">Camera Settings</label>
							<Input
								{...register("settings")}
								placeholder="e.g., f/2.8 • 1/125s • ISO 200 • 50mm"
							/>
							<p className="text-xs text-gray-500">
								Aperture, shutter speed, ISO, focal length
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Form Actions */}
				<div className="flex justify-between items-center pt-4">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>

					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-500">
							{!isValid && "Please complete all required fields"}
						</span>
						<Button
							type="submit"
							disabled={!isValid || isSubmitting}
							className="min-w-24"
						>
							{isSubmitting ? "Submitting..." : "Submit Photo"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}

export default PhotoMetadataForm;
