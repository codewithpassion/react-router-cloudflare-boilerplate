import {
	Eye,
	Grid,
	Image as ImageIcon,
	List,
	Search,
	Trophy,
} from "lucide-react";
import { useState } from "react";
import { PhotoCard } from "~/components/features/photos/photo-card";
import { MainLayout } from "~/components/main-layout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";

// Mock data for demonstration
const mockPhotos = [
	{
		id: "1",
		title: "Mountain Sunrise",
		filePath:
			"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
		voteCount: 23,
		userHasVoted: false,
		canVote: false,
		status: "approved" as const,
		photographer: { id: "1", name: "John Doe" },
		competition: { id: "1", title: "Nature Photography Contest" },
		category: { id: "1", name: "Landscapes" },
		location: "Rocky Mountains, Colorado",
		isWinner: true,
		rank: 1,
	},
	{
		id: "2",
		title: "Eagle in Flight",
		filePath:
			"https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=400",
		voteCount: 18,
		userHasVoted: false,
		canVote: false,
		status: "approved" as const,
		photographer: { id: "2", name: "Jane Smith" },
		competition: { id: "1", title: "Nature Photography Contest" },
		category: { id: "2", name: "Wildlife" },
		location: "Yellowstone National Park",
	},
	{
		id: "3",
		title: "City Lights",
		filePath:
			"https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400",
		voteCount: 35,
		userHasVoted: false,
		canVote: false,
		status: "approved" as const,
		photographer: { id: "3", name: "Mike Johnson" },
		competition: { id: "2", title: "Street Photography Challenge" },
		category: { id: "3", name: "Urban Life" },
		location: "New York City",
		isWinner: true,
		rank: 2,
	},
];

const isLoading = false; // Replace with actual loading state

export default function Gallery() {
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [competitionFilter, setCompetitionFilter] = useState("all");
	const [sortBy, setSortBy] = useState("popular");
	const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");

	const filteredPhotos = mockPhotos.filter((photo) => {
		const matchesSearch =
			photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			photo.photographer.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory =
			categoryFilter === "all" || photo.category?.name === categoryFilter;
		const matchesCompetition =
			competitionFilter === "all" ||
			photo.competition?.title === competitionFilter;
		return matchesSearch && matchesCategory && matchesCompetition;
	});

	return (
		<MainLayout>
			<div className="min-h-screen bg-gray-50">
				{/* Hero Section */}
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
					<div className="container mx-auto px-4 py-16">
						<div className="text-center max-w-3xl mx-auto">
							<div className="flex justify-center mb-6">
								<div className="p-4 bg-white/10 rounded-full">
									<ImageIcon className="w-12 h-12" />
								</div>
							</div>
							<h1 className="text-4xl md:text-5xl font-bold mb-6">
								Photo Gallery
							</h1>
							<p className="text-xl md:text-2xl mb-8 text-purple-100">
								Discover amazing photography from our community competitions.
								Browse winning entries and find inspiration.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center text-purple-100">
								<div className="flex items-center gap-2">
									<Trophy className="w-5 h-5" />
									<span>Award Winners</span>
								</div>
								<div className="flex items-center gap-2">
									<Eye className="w-5 h-5" />
									<span>Featured Photos</span>
								</div>
								<div className="flex items-center gap-2">
									<ImageIcon className="w-5 h-5" />
									<span>Community Showcase</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="container mx-auto px-4 py-8">
					{/* Filters */}
					<div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
						<div className="flex flex-col lg:flex-row gap-4 mb-4">
							{/* Search */}
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<Input
									placeholder="Search photos by title or photographer..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>

							{/* Category Filter */}
							<Select value={categoryFilter} onValueChange={setCategoryFilter}>
								<SelectTrigger className="w-full lg:w-48">
									<SelectValue placeholder="Category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									<SelectItem value="Landscapes">Landscapes</SelectItem>
									<SelectItem value="Wildlife">Wildlife</SelectItem>
									<SelectItem value="Urban Life">Urban Life</SelectItem>
									<SelectItem value="Portraits">Portraits</SelectItem>
								</SelectContent>
							</Select>

							{/* Competition Filter */}
							<Select
								value={competitionFilter}
								onValueChange={setCompetitionFilter}
							>
								<SelectTrigger className="w-full lg:w-48">
									<SelectValue placeholder="Competition" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Competitions</SelectItem>
									<SelectItem value="Nature Photography Contest">
										Nature Contest
									</SelectItem>
									<SelectItem value="Street Photography Challenge">
										Street Challenge
									</SelectItem>
									<SelectItem value="Portrait Masters">
										Portrait Masters
									</SelectItem>
								</SelectContent>
							</Select>

							{/* Sort */}
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-full lg:w-48">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="popular">Most Popular</SelectItem>
									<SelectItem value="recent">Most Recent</SelectItem>
									<SelectItem value="votes">Most Votes</SelectItem>
									<SelectItem value="random">Random</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* View Mode Toggle */}
						<div className="flex justify-between items-center">
							<div className="text-sm text-gray-600">
								{filteredPhotos.length} photo
								{filteredPhotos.length === 1 ? "" : "s"} found
							</div>
							<div className="flex rounded-lg border bg-white">
								<button
									type="button"
									onClick={() => setViewMode("grid")}
									className={`px-3 py-2 text-sm font-medium rounded-l-md transition-colors ${
										viewMode === "grid"
											? "bg-blue-500 text-white"
											: "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
									}`}
								>
									<Grid className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setViewMode("masonry")}
									className={`px-3 py-2 text-sm font-medium rounded-r-md transition-colors ${
										viewMode === "masonry"
											? "bg-blue-500 text-white"
											: "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
									}`}
								>
									<List className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>

					{/* Featured Winners Section */}
					{!searchQuery &&
						categoryFilter === "all" &&
						competitionFilter === "all" && (
							<div className="mb-12">
								<div className="text-center mb-8">
									<h2 className="text-2xl font-bold text-gray-900 mb-2">
										Featured Winners
									</h2>
									<p className="text-gray-600">
										Celebrating our most outstanding photographers
									</p>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									{mockPhotos
										.filter((photo) => photo.isWinner)
										.slice(0, 3)
										.map((photo) => (
											<PhotoCard
												key={photo.id}
												photo={photo}
												size="lg"
												showVoting={false}
												onClick={() => console.log("View photo:", photo.id)}
											/>
										))}
								</div>
							</div>
						)}

					{/* Photos Grid */}
					{isLoading ? (
						<div
							className={`grid gap-6 ${
								viewMode === "grid"
									? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
									: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
							}`}
						>
							{[...Array(12)].map((_, i) => (
								<div key={`gallery-loading-${i}`} className="space-y-4">
									<Skeleton
										className={`w-full rounded-lg ${
											viewMode === "masonry" ? "h-64" : "aspect-square"
										}`}
									/>
									<div className="space-y-2">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : filteredPhotos.length > 0 ? (
						<div
							className={`grid gap-6 ${
								viewMode === "grid"
									? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
									: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
							}`}
						>
							{filteredPhotos.map((photo) => (
								<PhotoCard
									key={photo.id}
									photo={photo}
									showVoting={false}
									onClick={() => console.log("View photo:", photo.id)}
								/>
							))}
						</div>
					) : (
						<div className="text-center py-12">
							<div className="max-w-md mx-auto">
								<div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
									<Search className="w-8 h-8 text-gray-400" />
								</div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									No photos found
								</h3>
								<p className="text-gray-600 mb-4">
									Try adjusting your search criteria or filters to find more
									photos.
								</p>
								<Button
									variant="outline"
									onClick={() => {
										setSearchQuery("");
										setCategoryFilter("all");
										setCompetitionFilter("all");
									}}
								>
									Clear all filters
								</Button>
							</div>
						</div>
					)}

					{/* Load More Button */}
					{filteredPhotos.length > 0 && !isLoading && (
						<div className="text-center mt-12">
							<Button variant="outline" size="lg">
								Load More Photos
							</Button>
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	);
}
