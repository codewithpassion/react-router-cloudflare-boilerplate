import {
	AlertCircle,
	ArrowLeft,
	Camera,
	Edit,
	Loader2,
	Save,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
	PhotoMetadataForm,
	type PhotoMetadataFormData,
} from "~/components/features/photos/photo-metadata-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/ui/status-badge";
import { useAuth } from "~/hooks/use-auth";

// Mock data - replace with tRPC hooks
const mockPhoto = {
	id: "photo-1",
	title: "Sunset over the Mountains",
	description:
		"A beautiful sunset captured during a hiking trip in the Rocky Mountains. The golden light creates a dramatic silhouette against the mountain peaks.",
	filePath:
		"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
	status: "pending" as const,
	dateTaken: "2024-07-15",
	location: "Rocky Mountain National Park, Colorado",
	cameraInfo: "Canon EOS R5 • 24-70mm f/2.8",
	settings: "f/8 • 1/125s • ISO 200 • 50mm",
	voteCount: 0,
	userHasVoted: false,
	canVote: false,
	photographer: {
		id: "user-1",
		name: "John Doe",
	},
	competition: {
		id: "comp-1",
		title: "Summer Photography Challenge 2024",
	},
	category: {
		id: "landscape",
		name: "Landscape",
	},
	createdAt: "2024-07-20T10:30:00Z",
	updatedAt: "2024-07-20T10:30:00Z",
};

export default function EditPhoto() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user, isAuthenticated } = useAuth();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	// Mock data - replace with actual tRPC calls
	const photo = mockPhoto;
	const isLoading = false;
	const error = null;

	if (!isAuthenticated) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">Login Required</h2>
						<p className="text-gray-600 mb-4">
							You need to be logged in to edit photos.
						</p>
						<Button asChild>
							<Link to="/login">Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
						<p className="text-gray-600">Loading photo...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error || !photo) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">Photo Not Found</h2>
						<p className="text-gray-600 mb-4">
							The photo you're looking for doesn't exist or you don't have
							permission to edit it.
						</p>
						<div className="flex justify-center gap-3">
							<Button variant="outline" asChild>
								<Link to="/photos">Back to Photos</Link>
							</Button>
							<Button asChild>
								<Link to="/dashboard">Dashboard</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Check if user owns the photo
	if (photo.photographer.id !== user?.id) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">Access Denied</h2>
						<p className="text-gray-600 mb-4">
							You don't have permission to edit this photo.
						</p>
						<Button asChild>
							<Link to="/photos">Back to My Photos</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Check if photo can be edited (only pending photos)
	if (photo.status !== "pending") {
		const statusMessages = {
			approved: "This photo has been approved and can no longer be edited.",
			rejected:
				"This photo was rejected and cannot be edited. You may delete it and resubmit a new version.",
		};

		return (
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<Button variant="ghost" asChild>
						<Link to="/photos">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to My Photos
						</Link>
					</Button>
				</div>

				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">Cannot Edit Photo</h2>
						<p className="text-gray-600 mb-4">
							{statusMessages[photo.status as keyof typeof statusMessages]}
						</p>

						<div className="mb-4">
							<StatusBadge status={photo.status} />
						</div>

						<div className="flex justify-center gap-3">
							<Button variant="outline" asChild>
								<Link to="/photos">Back to Photos</Link>
							</Button>
							{photo.competition && (
								<Button asChild>
									<Link to={`/competitions/${photo.competition.id}/submit`}>
										Submit New Photo
									</Link>
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleMetadataSubmit = async (data: PhotoMetadataFormData) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			// Mock API call - replace with actual tRPC mutation
			await new Promise((resolve) => setTimeout(resolve, 2000));

			console.log("Updating photo with data:", data);

			// Navigate back to photos list with success message
			navigate("/photos", {
				state: {
					message: "Photo updated successfully!",
				},
			});
		} catch (error) {
			console.error("Error updating photo:", error);
			setSubmitError(
				error instanceof Error ? error.message : "Failed to update photo",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		navigate("/photos");
	};

	return (
		<div className="container mx-auto px-4 py-8 space-y-6">
			{/* Header */}
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/photos">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to My Photos
					</Link>
				</Button>

				<div>
					<h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
						<Edit className="w-8 h-8" />
						Edit Photo
					</h1>
					<p className="text-gray-600">
						Update your photo details. Changes will be saved and the photo will
						remain in pending status.
					</p>
				</div>
			</div>

			{/* Error Message */}
			{submitError && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
							<div>
								<h3 className="font-medium text-red-900">Update Failed</h3>
								<p className="text-red-700 text-sm mt-1">{submitError}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Photo Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Camera className="w-5 h-5" />
							Photo Information
						</div>
						<StatusBadge status={photo.status} />
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-2">Competition</h4>
							<p className="text-gray-600">{photo.competition?.title}</p>
						</div>
						<div>
							<h4 className="font-medium mb-2">Category</h4>
							<p className="text-gray-600">{photo.category?.name}</p>
						</div>
						<div>
							<h4 className="font-medium mb-2">Submitted</h4>
							<p className="text-gray-600">
								{new Date(photo.createdAt).toLocaleDateString()} at{" "}
								{new Date(photo.createdAt).toLocaleTimeString()}
							</p>
						</div>
						<div>
							<h4 className="font-medium mb-2">Last Updated</h4>
							<p className="text-gray-600">
								{new Date(photo.updatedAt).toLocaleDateString()} at{" "}
								{new Date(photo.updatedAt).toLocaleTimeString()}
							</p>
						</div>
					</div>

					<div className="pt-4 border-t">
						<p className="text-sm text-gray-500">
							<strong>Note:</strong> Only photos with "pending" status can be
							edited. Once approved or rejected, no further changes are allowed.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Edit Form */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Photo Preview */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Current Photo</CardTitle>
						</CardHeader>
						<CardContent>
							<img
								src={photo.filePath}
								alt={photo.title}
								className="w-full rounded-lg shadow-lg"
							/>
						</CardContent>
					</Card>
				</div>

				{/* Metadata Form */}
				<div>
					<PhotoMetadataForm
						photo={{
							...photo,
							preview: photo.filePath,
						}}
						competitionId={photo.competition?.id || ""}
						categoryId={photo.category?.id || ""}
						onSubmit={handleMetadataSubmit}
						onCancel={handleCancel}
						isSubmitting={isSubmitting}
					/>
				</div>
			</div>

			{/* Additional Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-red-600">
						<X className="w-5 h-5" />
						Danger Zone
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-4 p-4 border border-red-200 rounded-lg bg-red-50">
						<AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h4 className="font-medium text-red-900">Delete Photo</h4>
							<p className="text-red-700 text-sm mt-1">
								Permanently delete this photo from the competition. This action
								cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								if (
									confirm(
										"Are you sure you want to delete this photo? This action cannot be undone.",
									)
								) {
									// Handle photo deletion
									console.log("Deleting photo:", photo.id);
									navigate("/photos");
								}
							}}
						>
							Delete
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
