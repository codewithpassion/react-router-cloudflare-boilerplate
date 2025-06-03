import { format, isAfter, isBefore } from "date-fns";
import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	Clock,
	Trophy,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CategorySelector } from "~/components/features/competitions/category-selector";
import { PhotoUpload } from "~/components/features/photos/photo-upload";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/ui/status-badge";
import { useAuth } from "~/hooks/use-auth";

// Mock data - replace with tRPC hooks
const mockCompetition = {
	id: "comp-1",
	title: "Summer Photography Challenge 2024",
	description:
		"Capture the beauty of summer in all its forms. From landscapes to portraits, show us what summer means to you.",
	startDate: "2024-06-01",
	endDate: "2024-08-31",
	status: "open" as const,
	rules: [
		"Photos must be taken during the competition period",
		"Original work only - no stock photos",
		"Maximum 3 photos per category",
		"Photos must be at least 1920x1080 resolution",
		"No excessive editing or manipulation",
	],
	prizes: [
		"1st Place: $1,000 + Professional Portfolio Review",
		"2nd Place: $500 + Camera Equipment",
		"3rd Place: $250 + Photography Workshop",
	],
	categories: [
		{
			id: "landscape",
			name: "Landscape",
			description:
				"Capture stunning natural vistas, mountains, beaches, forests, and outdoor scenes that showcase the beauty of our world.",
			maxPhotosPerUser: 3,
			maxPhotosTotal: 100,
			rules: [
				"Must be outdoor natural scenes",
				"Minimal human presence allowed",
				"No studio or indoor shots",
			],
			examples: ["Mountains", "Beaches", "Forests", "Deserts", "Rivers"],
		},
		{
			id: "portrait",
			name: "Portrait",
			description:
				"Showcase the human spirit through compelling portraits that tell a story or capture emotion.",
			maxPhotosPerUser: 2,
			maxPhotosTotal: 80,
			rules: [
				"Subject must be clearly visible",
				"Focus on human subjects",
				"Natural or studio lighting acceptable",
			],
			examples: [
				"Environmental portraits",
				"Studio portraits",
				"Street portraits",
				"Family photos",
			],
		},
		{
			id: "street",
			name: "Street Photography",
			description:
				"Document life as it happens in public spaces, capturing candid moments and urban scenes.",
			maxPhotosPerUser: 3,
			maxPhotosTotal: 120,
			rules: [
				"Must be taken in public spaces",
				"Candid moments preferred",
				"Minimal staging allowed",
			],
			examples: [
				"Urban scenes",
				"People in motion",
				"Architecture",
				"City life",
				"Markets",
			],
		},
	],
	_count: {
		photos: 45,
		votes: 234,
	},
};

const mockSubmissionCounts = {
	landscape: 1,
	portrait: 0,
	street: 2,
};

export default function SubmitPhoto() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user, isAuthenticated } = useAuth();

	const [selectedCategory, setSelectedCategory] = useState<
		(typeof mockCompetition.categories)[0] | null
	>(null);
	const [showUpload, setShowUpload] = useState(false);

	// Mock data - replace with actual tRPC calls
	const competition = mockCompetition;
	const submissionCounts = mockSubmissionCounts;
	const isLoading = false;

	if (!isAuthenticated) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">Login Required</h2>
						<p className="text-gray-600 mb-4">
							You need to be logged in to submit photos to competitions.
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
				<div className="animate-pulse space-y-6">
					<div className="h-8 bg-gray-200 rounded w-1/3" />
					<div className="h-64 bg-gray-200 rounded" />
				</div>
			</div>
		);
	}

	if (!competition) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="text-center py-12">
						<AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">
							Competition Not Found
						</h2>
						<p className="text-gray-600 mb-4">
							The competition you're looking for doesn't exist or has been
							removed.
						</p>
						<Button asChild>
							<Link to="/competitions">Browse Competitions</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (competition.status !== "open") {
		const now = new Date();
		const startDate = new Date(competition.startDate);
		const endDate = new Date(competition.endDate);

		let message = "This competition is not currently accepting submissions.";
		let suggestion = "Check back later or browse other competitions.";

		if (isBefore(now, startDate)) {
			message = "This competition hasn't started yet.";
			suggestion = `Submissions open on ${format(startDate, "MMMM dd, yyyy")}.`;
		} else if (isAfter(now, endDate)) {
			message = "This competition has ended.";
			suggestion = "Browse current competitions to participate.";
		}

		return (
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<Button variant="ghost" asChild>
						<Link to={`/competitions/${id}`}>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Competition
						</Link>
					</Button>
				</div>

				<Card>
					<CardContent className="text-center py-12">
						<Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h2 className="text-xl font-semibold mb-2">{message}</h2>
						<p className="text-gray-600 mb-4">{suggestion}</p>
						<div className="flex justify-center gap-3">
							<Button variant="outline" asChild>
								<Link to={`/competitions/${id}`}>View Competition</Link>
							</Button>
							<Button asChild>
								<Link to="/competitions">Browse Competitions</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleCategorySelect = (
		category: (typeof mockCompetition.categories)[0],
	) => {
		setSelectedCategory(category);
		setShowUpload(true);
	};

	const handleSubmissionSuccess = (photos: any[]) => {
		// Show success message and redirect
		console.log("Photos submitted successfully:", photos);
		navigate(`/competitions/${id}`, {
			state: {
				message: `Successfully submitted ${photos.length} photo${photos.length === 1 ? "" : "s"}!`,
			},
		});
	};

	const handleSubmissionError = (error: string) => {
		console.error("Submission error:", error);
		// Could show toast notification here
	};

	return (
		<div className="container mx-auto px-4 py-8 space-y-8">
			{/* Header */}
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to={`/competitions/${id}`}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Competition
					</Link>
				</Button>

				<div>
					<h1 className="text-3xl font-bold mb-2">
						Submit to {competition.title}
					</h1>
					<p className="text-gray-600">
						Upload your photos for this competition. Choose a category and
						follow the submission guidelines.
					</p>
				</div>
			</div>

			{/* Competition Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Trophy className="w-5 h-5" />
						Competition Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="flex items-center gap-3">
							<Calendar className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Duration</p>
								<p className="font-medium">
									{format(new Date(competition.startDate), "MMM dd")} -{" "}
									{format(new Date(competition.endDate), "MMM dd, yyyy")}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Users className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Submissions</p>
								<p className="font-medium">
									{competition._count.photos} photos
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<StatusBadge status={competition.status} />
							<div>
								<p className="text-sm text-gray-600">Status</p>
								<p className="font-medium capitalize">{competition.status}</p>
							</div>
						</div>
					</div>

					<div>
						<p className="text-gray-700 leading-relaxed">
							{competition.description}
						</p>
					</div>

					{/* Quick Rules */}
					<div>
						<h4 className="font-medium mb-2">Key Rules:</h4>
						<ul className="text-sm text-gray-600 space-y-1">
							{competition.rules.slice(0, 3).map((rule, index) => (
								<li key={index} className="flex items-start gap-2">
									<span className="text-blue-500 mt-1">•</span>
									<span>{rule}</span>
								</li>
							))}
							{competition.rules.length > 3 && (
								<li className="text-gray-500 italic">
									+{competition.rules.length - 3} more rules...
								</li>
							)}
						</ul>
					</div>
				</CardContent>
			</Card>

			{/* Category Selection */}
			{!showUpload && (
				<CategorySelector
					categories={competition.categories}
					submissionCounts={submissionCounts}
					onCategorySelect={handleCategorySelect}
					selectedCategory={selectedCategory}
				/>
			)}

			{/* Photo Upload */}
			{showUpload && selectedCategory && (
				<div className="space-y-6">
					{/* Selected category info */}
					<Card>
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="font-medium">
										Selected Category: {selectedCategory.name}
									</h3>
									<p className="text-sm text-gray-600">
										{selectedCategory.description}
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowUpload(false)}
								>
									Change Category
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Upload component */}
					<PhotoUpload
						competitionId={competition.id}
						categoryId={selectedCategory.id}
						maxPhotos={
							selectedCategory.maxPhotosPerUser -
							(submissionCounts[selectedCategory.id] || 0)
						}
						onSuccess={handleSubmissionSuccess}
						onError={handleSubmissionError}
					/>
				</div>
			)}
		</div>
	);
}
