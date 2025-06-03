import { format, formatDistanceToNow, isAfter } from "date-fns";
import {
	ArrowLeft,
	Calendar,
	Camera,
	Clock,
	Eye,
	Trophy,
	Upload,
	Users,
	Vote,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { PhotoCard } from "~/components/features/photos/photo-card";
import { MainLayout } from "~/components/main-layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/ui/status-badge";

// Mock data for demonstration
const mockCompetition = {
	id: "1",
	title: "Nature Photography Contest",
	description:
		"Capture the beauty of nature in all its forms. From landscapes to wildlife, show us the natural world through your lens. This competition celebrates the incredible diversity and beauty of our natural world.",
	startDate: "2024-01-01T00:00:00",
	endDate: "2024-02-28T23:59:59",
	votingStartDate: "2024-03-01T00:00:00",
	votingEndDate: "2024-03-15T23:59:59",
	status: "open" as const,
	rules: [
		"Photos must be original and taken by the submitter",
		"Maximum 3 submissions per participant",
		"Photos must be related to nature theme",
		"No excessive digital manipulation allowed",
	],
	prizes: [
		"First Place: $500 + Featured Gallery Exhibition",
		"Second Place: $300 + Photography Equipment",
		"Third Place: $100 + Certificate",
	],
	_count: {
		photos: 45,
		votes: 892,
		participants: 23,
	},
	categories: [
		{
			id: "1",
			name: "Landscapes",
			description: "Scenic natural vistas and landscapes",
		},
		{
			id: "2",
			name: "Wildlife",
			description: "Animals in their natural habitat",
		},
	],
};

const mockPhotos = [
	{
		id: "1",
		title: "Mountain Sunrise",
		filePath:
			"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
		voteCount: 23,
		userHasVoted: false,
		canVote: true,
		status: "approved" as const,
		photographer: { id: "1", name: "John Doe" },
		competition: { id: "1", title: "Nature Photography Contest" },
		category: { id: "1", name: "Landscapes" },
		location: "Rocky Mountains, Colorado",
	},
	{
		id: "2",
		title: "Eagle in Flight",
		filePath:
			"https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=400",
		voteCount: 18,
		userHasVoted: true,
		canVote: true,
		status: "approved" as const,
		photographer: { id: "2", name: "Jane Smith" },
		competition: { id: "1", title: "Nature Photography Contest" },
		category: { id: "2", name: "Wildlife" },
		location: "Yellowstone National Park",
	},
];

export default function CompetitionDetail() {
	const { id } = useParams();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	// Mock loading and error states
	const isLoading = false;
	const competition = mockCompetition;
	const photos = mockPhotos;

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="animate-pulse space-y-8">
					<div className="h-8 bg-gray-200 rounded w-1/3" />
					<div className="h-64 bg-gray-200 rounded" />
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[...Array(6)].map((_, i) => (
							<div key={`skeleton-${i}`} className="h-64 bg-gray-200 rounded" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (!competition) {
		return (
			<div className="container mx-auto px-4 py-8 text-center">
				<h1 className="text-2xl font-bold mb-4">Competition Not Found</h1>
				<p className="text-gray-600 mb-4">
					The competition you're looking for doesn't exist.
				</p>
				<Button asChild>
					<Link to="/competitions">Back to Competitions</Link>
				</Button>
			</div>
		);
	}

	const now = new Date();
	const endDate = new Date(competition.endDate);
	const timeLeft = isAfter(endDate, now)
		? formatDistanceToNow(endDate, { addSuffix: true })
		: null;

	const filteredPhotos = selectedCategory
		? photos.filter((photo) => photo.category?.id === selectedCategory)
		: photos;

	return (
		<MainLayout>
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<div className="bg-white border-b">
					<div className="container mx-auto px-4 py-6">
						<div className="flex items-center gap-4 mb-4">
							<Button variant="ghost" size="sm" asChild>
								<Link to="/competitions">
									<ArrowLeft className="w-4 h-4 mr-2" />
									Back to Competitions
								</Link>
							</Button>
						</div>

						<div className="flex flex-col lg:flex-row gap-6">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-3">
									<Trophy className="w-8 h-8 text-amber-500" />
									<h1 className="text-3xl font-bold text-gray-900">
										{competition.title}
									</h1>
									<StatusBadge status={competition.status} />
								</div>

								<p className="text-lg text-gray-600 mb-4">
									{competition.description}
								</p>

								<div className="flex flex-wrap gap-6 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4" />
										<span>
											{format(new Date(competition.startDate), "MMM dd")} -{" "}
											{format(new Date(competition.endDate), "MMM dd, yyyy")}
										</span>
									</div>
									{timeLeft && (
										<div className="flex items-center gap-2 text-blue-600">
											<Clock className="w-4 h-4" />
											<span className="font-medium">{timeLeft}</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<Camera className="w-4 h-4" />
										<span>{competition._count.photos} photos</span>
									</div>
									<div className="flex items-center gap-2">
										<Vote className="w-4 h-4" />
										<span>{competition._count.votes} votes</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4" />
										<span>{competition._count.participants} participants</span>
									</div>
								</div>
							</div>

							<div className="lg:w-64">
								{competition.status === "open" && (
									<Button size="lg" className="w-full mb-4" asChild>
										<Link to={`/competitions/${competition.id}/submit`}>
											<Upload className="w-4 h-4 mr-2" />
											Submit Photo
										</Link>
									</Button>
								)}
								{competition.status === "voting" && (
									<Button size="lg" className="w-full mb-4" variant="outline">
										<Vote className="w-4 h-4 mr-2" />
										Vote Now
									</Button>
								)}
								{competition.status === "closed" && (
									<Button
										size="lg"
										className="w-full mb-4"
										variant="outline"
										asChild
									>
										<Link to={`/competitions/${competition.id}/results`}>
											<Trophy className="w-4 h-4 mr-2" />
											View Results
										</Link>
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="container mx-auto px-4 py-8">
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
						{/* Sidebar */}
						<div className="lg:col-span-1 space-y-6">
							{/* Categories */}
							<Card>
								<CardHeader>
									<CardTitle>Categories</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<button
										type="button"
										onClick={() => setSelectedCategory(null)}
										className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
											selectedCategory === null
												? "bg-blue-100 text-blue-700"
												: "hover:bg-gray-100"
										}`}
									>
										All Categories ({photos.length})
									</button>
									{competition.categories.map((category) => (
										<button
											type="button"
											key={category.id}
											onClick={() => setSelectedCategory(category.id)}
											className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
												selectedCategory === category.id
													? "bg-blue-100 text-blue-700"
													: "hover:bg-gray-100"
											}`}
										>
											{category.name} (
											{
												photos.filter((p) => p.category?.id === category.id)
													.length
											}
											)
										</button>
									))}
								</CardContent>
							</Card>

							{/* Rules */}
							<Card>
								<CardHeader>
									<CardTitle>Competition Rules</CardTitle>
								</CardHeader>
								<CardContent>
									<ul className="space-y-2 text-sm">
										{competition.rules.map((rule, index) => (
											<li
												key={`rule-${index}`}
												className="flex items-start gap-2"
											>
												<span className="text-blue-600 mt-1">•</span>
												<span>{rule}</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>

							{/* Prizes */}
							<Card>
								<CardHeader>
									<CardTitle>Prizes</CardTitle>
								</CardHeader>
								<CardContent>
									<ul className="space-y-2 text-sm">
										{competition.prizes.map((prize, index) => (
											<li
												key={`prize-${index}`}
												className="flex items-start gap-2"
											>
												<Trophy className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
												<span>{prize}</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						</div>

						{/* Main Content */}
						<div className="lg:col-span-3">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-xl font-semibold">
									{selectedCategory
										? `${competition.categories.find((c) => c.id === selectedCategory)?.name} Photos`
										: "All Photos"}
								</h2>
								<div className="text-gray-600">
									{filteredPhotos.length} photo
									{filteredPhotos.length === 1 ? "" : "s"}
								</div>
							</div>

							{filteredPhotos.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{filteredPhotos.map((photo) => (
										<PhotoCard
											key={photo.id}
											photo={photo}
											showVoting={competition.status === "voting"}
											onVote={(photoId, voted) => {
												console.log("Vote:", photoId, voted);
											}}
											onClick={() => console.log("View photo:", photo.id)}
										/>
									))}
								</div>
							) : (
								<div className="text-center py-12">
									<div className="max-w-md mx-auto">
										<div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
											<Camera className="w-8 h-8 text-gray-400" />
										</div>
										<h3 className="text-lg font-medium text-gray-900 mb-2">
											No photos yet
										</h3>
										<p className="text-gray-600 mb-4">
											{selectedCategory
												? "No photos have been submitted to this category yet."
												: "No photos have been submitted to this competition yet."}
										</p>
										{competition.status === "open" && (
											<Button asChild>
												<Link to={`/competitions/${competition.id}/submit`}>
													<Upload className="w-4 h-4 mr-2" />
													Be the first to submit
												</Link>
											</Button>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
