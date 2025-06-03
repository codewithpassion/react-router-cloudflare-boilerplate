import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import {
	Calendar,
	Camera,
	Clock,
	Edit,
	Trash2,
	Trophy,
	Users,
	Vote,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { StatusBadge } from "~/components/ui/status-badge";
import { cn } from "~/lib/utils";

interface CompetitionCardProps {
	competition: {
		id: string;
		title: string;
		description: string;
		startDate: string;
		endDate: string;
		status: "draft" | "open" | "voting" | "closed";
		_count: {
			photos: number;
			votes: number;
		};
		categories?: Array<{ id: string; name: string }>;
	};
	variant?: "card" | "list";
	showActions?: boolean;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onClick?: () => void;
}

export function CompetitionCard({
	competition,
	variant = "card",
	showActions = false,
	onEdit,
	onDelete,
	onClick,
}: CompetitionCardProps) {
	const [timeLeft, setTimeLeft] = useState<string>("");

	// Calculate countdown timer
	useEffect(() => {
		const updateTimer = () => {
			const now = new Date();
			const endDate = new Date(competition.endDate);
			const startDate = new Date(competition.startDate);

			if (competition.status === "open" && isAfter(endDate, now)) {
				setTimeLeft(
					`Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`,
				);
			} else if (competition.status === "draft" && isAfter(startDate, now)) {
				setTimeLeft(
					`Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`,
				);
			} else {
				setTimeLeft("");
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 60000); // Update every minute

		return () => clearInterval(interval);
	}, [competition.endDate, competition.startDate, competition.status]);

	if (variant === "list") {
		return (
			<Card
				className={cn(
					"w-full transition-all hover:shadow-md",
					onClick && "cursor-pointer",
				)}
				onClick={onClick}
			>
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 mb-2">
								<h3 className="text-lg font-semibold truncate">
									{competition.title}
								</h3>
								<StatusBadge status={competition.status} size="sm" />
							</div>
							<p className="text-gray-600 text-sm line-clamp-2 mb-3">
								{competition.description}
							</p>
							<div className="flex items-center gap-4 text-sm text-gray-500">
								<div className="flex items-center gap-1">
									<Calendar className="w-4 h-4" />
									{format(new Date(competition.startDate), "MMM dd")} -{" "}
									{format(new Date(competition.endDate), "MMM dd, yyyy")}
								</div>
								<div className="flex items-center gap-1">
									<Camera className="w-4 h-4" />
									{competition._count.photos} photos
								</div>
								<div className="flex items-center gap-1">
									<Vote className="w-4 h-4" />
									{competition._count.votes} votes
								</div>
							</div>
						</div>
						{showActions && (
							<div className="flex items-center gap-2 ml-4">
								{onEdit && (
									<Button
										variant="outline"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											onEdit(competition.id);
										}}
									>
										<Edit className="w-4 h-4 mr-1" />
										Edit
									</Button>
								)}
								{onDelete && (
									<Button
										variant="outline"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											onDelete(competition.id);
										}}
									>
										<Trash2 className="w-4 h-4 mr-1" />
										Delete
									</Button>
								)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"w-full transition-all hover:shadow-md group",
				onClick && "cursor-pointer",
			)}
			onClick={onClick}
		>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
							<h3 className="text-lg font-semibold truncate group-hover:text-blue-600 transition-colors">
								{competition.title}
							</h3>
						</div>
						<StatusBadge status={competition.status} />
					</div>
					{showActions && (
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							{onEdit && (
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onEdit(competition.id);
									}}
								>
									<Edit className="w-4 h-4" />
								</Button>
							)}
							{onDelete && (
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(competition.id);
									}}
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							)}
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent className="pt-0">
				<p className="text-gray-600 text-sm mb-4 line-clamp-3">
					{competition.description}
				</p>

				{/* Date Information */}
				<div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
					<Calendar className="w-4 h-4" />
					<span>
						{format(new Date(competition.startDate), "MMM dd")} -{" "}
						{format(new Date(competition.endDate), "MMM dd, yyyy")}
					</span>
				</div>

				{/* Timer */}
				{timeLeft && (
					<div className="flex items-center gap-1 text-sm text-blue-600 mb-3">
						<Clock className="w-4 h-4" />
						<span className="font-medium">{timeLeft}</span>
					</div>
				)}

				{/* Categories */}
				{competition.categories && competition.categories.length > 0 && (
					<div className="mb-3">
						<div className="flex flex-wrap gap-1">
							{competition.categories.slice(0, 3).map((category) => (
								<span
									key={category.id}
									className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
								>
									{category.name}
								</span>
							))}
							{competition.categories.length > 3 && (
								<span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
									+{competition.categories.length - 3} more
								</span>
							)}
						</div>
					</div>
				)}

				{/* Statistics */}
				<div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1">
							<Camera className="w-4 h-4" />
							<span>{competition._count.photos}</span>
						</div>
						<div className="flex items-center gap-1">
							<Vote className="w-4 h-4" />
							<span>{competition._count.votes}</span>
						</div>
					</div>

					{competition.status === "open" && (
						<span className="text-green-600 font-medium text-xs">
							ACCEPTING SUBMISSIONS
						</span>
					)}
					{competition.status === "voting" && (
						<span className="text-blue-600 font-medium text-xs">
							VOTING LIVE
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
