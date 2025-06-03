import { Award, Calendar, Eye, Heart, MapPin, User } from "lucide-react";
import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { StatusBadge } from "~/components/ui/status-badge";
import { cn } from "~/lib/utils";

interface PhotoCardProps {
	photo: {
		id: string;
		title: string;
		filePath: string;
		voteCount: number;
		userHasVoted: boolean;
		canVote: boolean;
		status: "pending" | "approved" | "rejected";
		photographer: {
			id: string;
			name: string;
		};
		competition?: {
			id: string;
			title: string;
		};
		category?: {
			id: string;
			name: string;
		};
		createdAt?: string;
		location?: string;
		isWinner?: boolean;
		rank?: number;
	};
	size?: "sm" | "md" | "lg";
	showVoting?: boolean;
	showStatus?: boolean;
	showDetails?: boolean;
	onClick?: (photo: PhotoCardProps["photo"]) => void;
	onVote?: (photoId: string, voted: boolean) => void;
}

export function PhotoCard({
	photo,
	size = "md",
	showVoting = true,
	showStatus = false,
	showDetails = true,
	onClick,
	onVote,
}: PhotoCardProps) {
	const [isVoting, setIsVoting] = useState(false);
	const [localVoted, setLocalVoted] = useState(photo.userHasVoted);
	const [localVoteCount, setLocalVoteCount] = useState(photo.voteCount);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	// Lazy loading
	const { ref, inView } = useInView({
		threshold: 0.1,
		triggerOnce: true,
	});

	const handleVote = async (e: React.MouseEvent) => {
		e.stopPropagation();

		if (isVoting || !photo.canVote || !onVote) return;

		setIsVoting(true);
		const newVoted = !localVoted;

		// Optimistic update
		setLocalVoted(newVoted);
		setLocalVoteCount((prev) => (newVoted ? prev + 1 : prev - 1));

		try {
			await onVote(photo.id, newVoted);
		} catch (error) {
			// Revert on error
			setLocalVoted(photo.userHasVoted);
			setLocalVoteCount(photo.voteCount);
		} finally {
			setIsVoting(false);
		}
	};

	const sizeClasses = {
		sm: "aspect-square max-w-xs",
		md: "aspect-square max-w-sm",
		lg: "aspect-[4/3] max-w-md",
	};

	return (
		<Card
			ref={ref}
			className={cn(
				"w-full transition-all hover:shadow-lg group overflow-hidden",
				onClick && "cursor-pointer",
				sizeClasses[size],
			)}
			onClick={onClick}
		>
			{/* Image Container */}
			<div className="relative overflow-hidden bg-gray-100 aspect-square">
				{/* Winner Badge */}
				{photo.isWinner && (
					<div className="absolute top-2 left-2 z-10">
						<div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
							<Award className="w-3 h-3" />
							{photo.rank === 1
								? "1st Place"
								: photo.rank === 2
									? "2nd Place"
									: photo.rank === 3
										? "3rd Place"
										: `#${photo.rank}`}
						</div>
					</div>
				)}

				{/* Status Badge */}
				{showStatus && photo.status !== "approved" && (
					<div className="absolute top-2 right-2 z-10">
						<StatusBadge status={photo.status} size="sm" />
					</div>
				)}

				{/* Vote Button */}
				{showVoting && photo.canVote && onVote && (
					<div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							size="sm"
							variant={localVoted ? "default" : "secondary"}
							onClick={handleVote}
							disabled={isVoting}
							className={cn(
								"transition-all",
								localVoted && "bg-red-500 hover:bg-red-600 text-white",
							)}
						>
							<Heart
								className={cn(
									"w-4 h-4 mr-1 transition-all",
									localVoted && "fill-current",
								)}
							/>
							{localVoteCount}
						</Button>
					</div>
				)}

				{/* Image */}
				{inView && (
					<>
						{!imageError ? (
							<img
								src={photo.filePath}
								alt={photo.title}
								className={cn(
									"w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
									!imageLoaded && "opacity-0",
								)}
								onLoad={() => setImageLoaded(true)}
								onError={() => setImageError(true)}
								loading="lazy"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gray-200">
								<div className="text-center text-gray-500">
									<Eye className="w-8 h-8 mx-auto mb-2" />
									<span className="text-sm">Image unavailable</span>
								</div>
							</div>
						)}

						{/* Loading Placeholder */}
						{!imageLoaded && !imageError && (
							<div className="absolute inset-0 bg-gray-200 animate-pulse" />
						)}
					</>
				)}

				{/* Overlay for hover effect */}
				<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
			</div>

			{/* Content */}
			{showDetails && (
				<CardContent className="p-4">
					<div className="space-y-2">
						{/* Title */}
						<h3 className="font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
							{photo.title}
						</h3>

						{/* Photographer */}
						<div className="flex items-center gap-1 text-xs text-gray-600">
							<User className="w-3 h-3" />
							<span>by {photo.photographer.name}</span>
						</div>

						{/* Competition & Category */}
						{photo.competition && (
							<div className="text-xs text-gray-500 truncate">
								{photo.competition.title}
								{photo.category && ` • ${photo.category.name}`}
							</div>
						)}

						{/* Location */}
						{photo.location && (
							<div className="flex items-center gap-1 text-xs text-gray-500">
								<MapPin className="w-3 h-3" />
								<span className="truncate">{photo.location}</span>
							</div>
						)}

						{/* Stats Row */}
						<div className="flex items-center justify-between pt-2 border-t border-gray-100">
							<div className="flex items-center gap-3 text-xs text-gray-500">
								{!showVoting && (
									<div className="flex items-center gap-1">
										<Heart
											className={cn(
												"w-3 h-3",
												localVoted && "fill-current text-red-500",
											)}
										/>
										<span>{localVoteCount}</span>
									</div>
								)}
								{photo.createdAt && (
									<div className="flex items-center gap-1">
										<Calendar className="w-3 h-3" />
										<span>
											{new Date(photo.createdAt).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>

							{photo.isWinner && (
								<div className="text-xs font-medium text-amber-600">Winner</div>
							)}
						</div>
					</div>
				</CardContent>
			)}
		</Card>
	);
}
