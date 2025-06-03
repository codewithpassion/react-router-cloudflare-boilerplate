import {
	Award,
	Calendar,
	Camera,
	Eye,
	Heart,
	TrendingUp,
	Trophy,
	Upload,
} from "lucide-react";
import { Link } from "react-router";
import { CompetitionCard } from "~/components/features/competitions/competition-card";
import { PhotoCard } from "~/components/features/photos/photo-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useAuth } from "~/hooks/use-auth";

// Mock data for demonstration
const mockStats = {
	totalPhotos: 12,
	totalVotes: 89,
	competitionsEntered: 5,
	winnings: 2,
};

const mockRecentPhotos = [
	{
		id: "1",
		title: "Mountain Sunrise",
		filePath:
			"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300",
		voteCount: 23,
		userHasVoted: false,
		canVote: false,
		status: "approved" as const,
		photographer: { id: "1", name: "You" },
		competition: { id: "1", title: "Nature Photography Contest" },
		category: { id: "1", name: "Landscapes" },
		createdAt: "2024-01-15",
	},
	{
		id: "2",
		title: "Urban Reflections",
		filePath:
			"https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300",
		voteCount: 18,
		userHasVoted: false,
		canVote: false,
		status: "pending" as const,
		photographer: { id: "1", name: "You" },
		competition: { id: "2", title: "Street Photography Challenge" },
		category: { id: "3", name: "Urban Life" },
		createdAt: "2024-01-10",
	},
];

const mockActiveCompetitions = [
	{
		id: "1",
		title: "Nature Photography Contest",
		description: "Capture the beauty of nature in all its forms.",
		startDate: "2024-01-01",
		endDate: "2024-02-28",
		status: "open" as const,
		_count: { photos: 45, votes: 892 },
	},
	{
		id: "2",
		title: "Street Photography Challenge",
		description: "Document life as it happens on the streets.",
		startDate: "2024-02-01",
		endDate: "2024-03-15",
		status: "voting" as const,
		_count: { photos: 78, votes: 1245 },
	},
];

interface StatCardProps {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

function StatCard({
	title,
	value,
	icon: Icon,
	description,
	trend,
}: StatCardProps) {
	return (
		<Card>
			<CardContent className="p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-600">{title}</p>
						<p className="text-2xl font-bold">{value}</p>
						<p className="text-xs text-gray-500">{description}</p>
						{trend && (
							<div
								className={`flex items-center gap-1 text-xs mt-1 ${
									trend.isPositive ? "text-green-600" : "text-red-600"
								}`}
							>
								<TrendingUp className="w-3 h-3" />
								<span>
									{trend.isPositive ? "+" : ""}
									{trend.value}% this month
								</span>
							</div>
						)}
					</div>
					<div className="p-3 bg-blue-100 rounded-full">
						<Icon className="w-6 h-6 text-blue-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function UserDashboard() {
	const { user } = useAuth();

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Welcome back, {user?.name || "Photographer"}!
				</h1>
				<p className="text-gray-600">
					Here's what's happening with your photography competitions.
				</p>
			</div>

			{/* Stats Overview */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Photos Submitted"
					value={mockStats.totalPhotos}
					icon={Camera}
					description="Total submissions"
					trend={{ value: 15, isPositive: true }}
				/>
				<StatCard
					title="Votes Received"
					value={mockStats.totalVotes}
					icon={Heart}
					description="From the community"
					trend={{ value: 8, isPositive: true }}
				/>
				<StatCard
					title="Competitions Entered"
					value={mockStats.competitionsEntered}
					icon={Trophy}
					description="Active & completed"
				/>
				<StatCard
					title="Awards Won"
					value={mockStats.winnings}
					icon={Award}
					description="Competition wins"
					trend={{ value: 100, isPositive: true }}
				/>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Button asChild className="h-auto p-4">
							<Link to="/competitions">
								<div className="flex flex-col items-center gap-2">
									<Upload className="w-6 h-6" />
									<span>Submit to Competition</span>
								</div>
							</Link>
						</Button>
						<Button variant="outline" asChild className="h-auto p-4">
							<Link to="/photos">
								<div className="flex flex-col items-center gap-2">
									<Camera className="w-6 h-6" />
									<span>Manage Photos</span>
								</div>
							</Link>
						</Button>
						<Button variant="outline" asChild className="h-auto p-4">
							<Link to="/gallery">
								<div className="flex flex-col items-center gap-2">
									<Eye className="w-6 h-6" />
									<span>Browse Gallery</span>
								</div>
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Recent Photos */}
				<div>
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl font-semibold">Recent Photos</h2>
						<Button variant="outline" size="sm" asChild>
							<Link to="/photos">View All</Link>
						</Button>
					</div>

					{mockRecentPhotos.length > 0 ? (
						<div className="space-y-4">
							{mockRecentPhotos.map((photo) => (
								<div
									key={photo.id}
									className="flex gap-4 p-4 bg-white rounded-lg border"
								>
									<div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
										<img
											src={photo.filePath}
											alt={photo.title}
											className="w-full h-full object-cover"
										/>
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-medium truncate">{photo.title}</h3>
										<p className="text-sm text-gray-600 truncate">
											{photo.competition?.title}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
											<div className="flex items-center gap-1">
												<Heart className="w-3 h-3" />
												<span>{photo.voteCount}</span>
											</div>
											<div className="flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												<span>
													{new Date(photo.createdAt).toLocaleDateString()}
												</span>
											</div>
										</div>
									</div>
									<div className="flex-shrink-0">
										{photo.status === "pending" && (
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
												Pending
											</span>
										)}
										{photo.status === "approved" && (
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
												Approved
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 bg-white rounded-lg border">
							<Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600 mb-4">No photos submitted yet</p>
							<Button asChild>
								<Link to="/competitions">Submit Your First Photo</Link>
							</Button>
						</div>
					)}
				</div>

				{/* Active Competitions */}
				<div>
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl font-semibold">Active Competitions</h2>
						<Button variant="outline" size="sm" asChild>
							<Link to="/competitions">View All</Link>
						</Button>
					</div>

					<div className="space-y-4">
						{mockActiveCompetitions.map((competition) => (
							<CompetitionCard
								key={competition.id}
								competition={competition}
								variant="list"
								onClick={() => console.log("View competition:", competition.id)}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Achievement Showcase */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Award className="w-5 h-5 text-amber-500" />
						Recent Achievements
					</CardTitle>
				</CardHeader>
				<CardContent>
					{mockStats.winnings > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
								<div className="p-2 bg-amber-100 rounded-full">
									<Trophy className="w-5 h-5 text-amber-600" />
								</div>
								<div>
									<p className="font-medium text-amber-900">First Place</p>
									<p className="text-sm text-amber-700">
										Nature Photography Contest
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
								<div className="p-2 bg-gray-100 rounded-full">
									<Award className="w-5 h-5 text-gray-600" />
								</div>
								<div>
									<p className="font-medium text-gray-900">Third Place</p>
									<p className="text-sm text-gray-700">
										Street Photography Challenge
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-6">
							<Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600">No achievements yet</p>
							<p className="text-sm text-gray-500">
								Submit photos to competitions to start earning achievements!
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
