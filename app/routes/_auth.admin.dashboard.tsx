import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Heart,
	Photo,
	TrendingUp,
	Trophy,
	Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Mock data for demonstration - replace with actual tRPC queries
const mockStats = {
	activeCompetitions: 5,
	pendingPhotos: 23,
	totalVotes: 1247,
	activeUsers: 89,
	recentActivity: [
		{
			id: 1,
			type: "photo_submitted",
			user: "John Doe",
			competition: "Nature Photography",
			time: "2 minutes ago",
		},
		{
			id: 2,
			type: "competition_created",
			user: "Admin",
			competition: "Street Photography",
			time: "1 hour ago",
		},
		{
			id: 3,
			type: "photo_approved",
			user: "Jane Smith",
			competition: "Portrait Contest",
			time: "2 hours ago",
		},
	],
};

interface StatsCardProps {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	urgent?: boolean;
}

function StatsCard({
	title,
	value,
	icon: Icon,
	trend,
	urgent,
}: StatsCardProps) {
	return (
		<Card className={urgent ? "border-orange-200 bg-orange-50" : ""}>
			<CardContent className="p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-600">{title}</p>
						<p className="text-2xl font-bold">{value}</p>
						{trend && (
							<div
								className={`flex items-center gap-1 text-sm ${trend.isPositive ? "text-green-600" : "text-red-600"}`}
							>
								<TrendingUp className="w-3 h-3" />
								<span>
									{trend.isPositive ? "+" : ""}
									{trend.value}%
								</span>
							</div>
						)}
					</div>
					<div
						className={`p-3 rounded-full ${urgent ? "bg-orange-100" : "bg-blue-100"}`}
					>
						<Icon
							className={`w-6 h-6 ${urgent ? "text-orange-600" : "text-blue-600"}`}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function RecentActivityPanel() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="w-5 h-5" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{mockStats.recentActivity.map((activity) => (
						<div
							key={activity.id}
							className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
						>
							<div className="p-1 bg-blue-100 rounded-full">
								{activity.type === "photo_submitted" && (
									<Photo className="w-3 h-3 text-blue-600" />
								)}
								{activity.type === "competition_created" && (
									<Trophy className="w-3 h-3 text-blue-600" />
								)}
								{activity.type === "photo_approved" && (
									<CheckCircle className="w-3 h-3 text-blue-600" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm">
									<span className="font-medium">{activity.user}</span>
									{activity.type === "photo_submitted" &&
										" submitted a photo to "}
									{activity.type === "competition_created" && " created "}
									{activity.type === "photo_approved" &&
										" had their photo approved in "}
									<span className="font-medium">{activity.competition}</span>
								</p>
								<p className="text-xs text-gray-500">{activity.time}</p>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function ModerationQueuePreview() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertTriangle className="w-5 h-5" />
					Moderation Queue
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
						<div>
							<p className="text-sm font-medium">23 photos pending review</p>
							<p className="text-xs text-gray-600">
								Some photos have been waiting over 24 hours
							</p>
						</div>
						<AlertTriangle className="w-5 h-5 text-yellow-600" />
					</div>

					<div className="grid grid-cols-3 gap-2">
						{/* Mock photo thumbnails */}
						{[1, 2, 3].map((i) => (
							<div
								key={`photo-${i}`}
								className="aspect-square bg-gray-200 rounded-md animate-pulse"
							/>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function AdminDashboard() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold text-gray-900">
					Admin Dashboard
				</h1>
				<p className="text-gray-600">
					Manage competitions and moderate content
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatsCard
					title="Active Competitions"
					value={mockStats.activeCompetitions}
					icon={Trophy}
					trend={{ value: 12, isPositive: true }}
				/>
				<StatsCard
					title="Pending Photos"
					value={mockStats.pendingPhotos}
					icon={Photo}
					urgent={mockStats.pendingPhotos > 20}
				/>
				<StatsCard
					title="Total Votes"
					value={mockStats.totalVotes}
					icon={Heart}
					trend={{ value: 8, isPositive: true }}
				/>
				<StatsCard
					title="Active Users"
					value={mockStats.activeUsers}
					icon={Users}
					trend={{ value: 15, isPositive: true }}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<RecentActivityPanel />
				<ModerationQueuePreview />
			</div>
		</div>
	);
}
