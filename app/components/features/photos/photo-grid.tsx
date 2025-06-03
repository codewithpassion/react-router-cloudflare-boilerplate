import {
	Check,
	Edit,
	Eye,
	Grid3X3,
	Heart,
	List,
	MoreVertical,
	SortAsc,
	SortDesc,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import { StatusBadge } from "~/components/ui/status-badge";
import { cn } from "~/lib/utils";

interface Photo {
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
	createdAt: string;
	location?: string;
	isWinner?: boolean;
	rank?: number;
}

interface PhotoGridProps {
	photos: Photo[];
	selectedPhotos?: string[];
	onSelect?: (photoIds: string[]) => void;
	onEdit?: (photoId: string) => void;
	onDelete?: (photoId: string) => void;
	onView?: (photo: Photo) => void;
	onVote?: (photoId: string, voted: boolean) => void;
	enableSelection?: boolean;
	enableVoting?: boolean;
	layout?: "grid" | "masonry" | "list";
	size?: "sm" | "md" | "lg";
	isLoading?: boolean;
	emptyMessage?: string;
	showStatus?: boolean;
	showActions?: boolean;
}

export function PhotoGrid({
	photos,
	selectedPhotos = [],
	onSelect,
	onEdit,
	onDelete,
	onView,
	onVote,
	enableSelection = false,
	enableVoting = false,
	layout = "grid",
	size = "md",
	isLoading = false,
	emptyMessage = "No photos found",
	showStatus = false,
	showActions = false,
}: PhotoGridProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">(
		layout === "list" ? "list" : "grid",
	);

	const handleSelectPhoto = (photoId: string, checked: boolean) => {
		if (!onSelect) return;

		const newSelection = checked
			? [...selectedPhotos, photoId]
			: selectedPhotos.filter((id) => id !== photoId);

		onSelect(newSelection);
	};

	const handleSelectAll = (checked: boolean) => {
		if (!onSelect) return;

		onSelect(checked ? photos.map((p) => p.id) : []);
	};

	const getGridClasses = () => {
		if (viewMode === "list") {
			return "space-y-4";
		}

		const sizeClasses = {
			sm: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
			md: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
			lg: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
		};

		return `grid gap-4 ${sizeClasses[size]}`;
	};

	if (isLoading) {
		return (
			<div className={getGridClasses()}>
				{Array.from({ length: 8 }).map((_, index) => (
					<PhotoGridSkeleton key={index} layout={viewMode} size={size} />
				))}
			</div>
		);
	}

	if (photos.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="w-16 h-16 mb-4 text-gray-400">
					<Grid3X3 className="w-full h-full" />
				</div>
				<h3 className="text-lg font-medium text-gray-900 mb-2">No Photos</h3>
				<p className="text-gray-500">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header with selection controls */}
			{enableSelection && (
				<div className="flex items-center justify-between border-b pb-4">
					<div className="flex items-center gap-4">
						<Checkbox
							checked={
								selectedPhotos.length === photos.length && photos.length > 0
							}
							onCheckedChange={handleSelectAll}
						/>
						<span className="text-sm text-gray-600">
							{selectedPhotos.length > 0
								? `${selectedPhotos.length} of ${photos.length} selected`
								: `${photos.length} photos`}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setViewMode("grid")}
							className={cn(viewMode === "grid" && "bg-gray-100")}
						>
							<Grid3X3 className="w-4 h-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setViewMode("list")}
							className={cn(viewMode === "list" && "bg-gray-100")}
						>
							<List className="w-4 h-4" />
						</Button>
					</div>
				</div>
			)}

			{/* Photo Grid */}
			<div className={getGridClasses()}>
				{photos.map((photo) => (
					<PhotoGridItem
						key={photo.id}
						photo={photo}
						layout={viewMode}
						size={size}
						isSelected={selectedPhotos.includes(photo.id)}
						onSelect={enableSelection ? handleSelectPhoto : undefined}
						onEdit={onEdit}
						onDelete={onDelete}
						onView={onView}
						onVote={onVote}
						enableVoting={enableVoting}
						showStatus={showStatus}
						showActions={showActions}
					/>
				))}
			</div>
		</div>
	);
}

interface PhotoGridItemProps {
	photo: Photo;
	layout: "grid" | "list";
	size: "sm" | "md" | "lg";
	isSelected: boolean;
	onSelect?: (photoId: string, checked: boolean) => void;
	onEdit?: (photoId: string) => void;
	onDelete?: (photoId: string) => void;
	onView?: (photo: Photo) => void;
	onVote?: (photoId: string, voted: boolean) => void;
	enableVoting: boolean;
	showStatus: boolean;
	showActions: boolean;
}

function PhotoGridItem({
	photo,
	layout,
	size,
	isSelected,
	onSelect,
	onEdit,
	onDelete,
	onView,
	onVote,
	enableVoting,
	showStatus,
	showActions,
}: PhotoGridItemProps) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const { ref, inView } = useInView({
		threshold: 0.1,
		triggerOnce: true,
	});

	const handleVote = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!onVote || !photo.canVote) return;
		await onVote(photo.id, !photo.userHasVoted);
	};

	if (layout === "list") {
		return (
			<Card
				ref={ref}
				className={cn(
					"transition-all hover:shadow-md",
					onView && "cursor-pointer",
					isSelected && "ring-2 ring-blue-500",
				)}
				onClick={() => onView?.(photo)}
			>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						{/* Selection Checkbox */}
						{onSelect && (
							<Checkbox
								checked={isSelected}
								onCheckedChange={(checked) =>
									onSelect(photo.id, checked as boolean)
								}
								onClick={(e) => e.stopPropagation()}
							/>
						)}

						{/* Image */}
						<div className="flex-shrink-0">
							{inView && !imageError ? (
								<img
									src={photo.filePath}
									alt={photo.title}
									className={cn(
										"object-cover rounded transition-opacity",
										size === "sm" ? "w-16 h-16" : "w-20 h-20",
										!imageLoaded && "opacity-0",
									)}
									onLoad={() => setImageLoaded(true)}
									onError={() => setImageError(true)}
								/>
							) : (
								<div
									className={cn(
										"bg-gray-200 rounded flex items-center justify-center",
										size === "sm" ? "w-16 h-16" : "w-20 h-20",
									)}
								>
									<Eye className="w-6 h-6 text-gray-400" />
								</div>
							)}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between">
								<div className="flex-1 min-w-0">
									<h3 className="font-medium truncate">{photo.title}</h3>
									<p className="text-sm text-gray-600">
										by {photo.photographer.name}
									</p>
									{photo.competition && (
										<p className="text-xs text-gray-500">
											{photo.competition.title}
										</p>
									)}
								</div>

								{/* Status & Actions */}
								<div className="flex items-center gap-2 ml-2">
									{showStatus && (
										<StatusBadge status={photo.status} size="sm" />
									)}

									{enableVoting && photo.canVote && (
										<Button
											type="button"
											variant={photo.userHasVoted ? "default" : "outline"}
											size="sm"
											onClick={handleVote}
											className={cn(
												"transition-all",
												photo.userHasVoted &&
													"bg-red-500 hover:bg-red-600 text-white",
											)}
										>
											<Heart
												className={cn(
													"w-4 h-4 mr-1",
													photo.userHasVoted && "fill-current",
												)}
											/>
											{photo.voteCount}
										</Button>
									)}

									{showActions && (
										<div className="flex items-center gap-1">
											{onEdit && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														onEdit(photo.id);
													}}
												>
													<Edit className="w-4 h-4" />
												</Button>
											)}
											{onDelete && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														onDelete(photo.id);
													}}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Grid layout
	return (
		<Card
			ref={ref}
			className={cn(
				"group transition-all hover:shadow-lg overflow-hidden",
				onView && "cursor-pointer",
				isSelected && "ring-2 ring-blue-500",
			)}
			onClick={() => onView?.(photo)}
		>
			{/* Image Container */}
			<div
				className={cn(
					"relative bg-gray-100 overflow-hidden",
					size === "sm" ? "aspect-square" : "aspect-[4/3]",
				)}
			>
				{/* Selection Checkbox */}
				{onSelect && (
					<div className="absolute top-2 left-2 z-10">
						<Checkbox
							checked={isSelected}
							onCheckedChange={(checked) =>
								onSelect(photo.id, checked as boolean)
							}
							onClick={(e) => e.stopPropagation()}
							className="bg-white shadow-sm"
						/>
					</div>
				)}

				{/* Status Badge */}
				{showStatus && photo.status !== "approved" && (
					<div className="absolute top-2 right-2 z-10">
						<StatusBadge status={photo.status} size="sm" />
					</div>
				)}

				{/* Winner Badge */}
				{photo.isWinner && (
					<div className="absolute top-2 left-2 z-10">
						<div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-1 rounded text-xs font-bold">
							#{photo.rank}
						</div>
					</div>
				)}

				{/* Vote Button */}
				{enableVoting && photo.canVote && (
					<div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							type="button"
							size="sm"
							variant={photo.userHasVoted ? "default" : "secondary"}
							onClick={handleVote}
							className={cn(
								"transition-all shadow-sm",
								photo.userHasVoted && "bg-red-500 hover:bg-red-600 text-white",
							)}
						>
							<Heart
								className={cn(
									"w-4 h-4 mr-1",
									photo.userHasVoted && "fill-current",
								)}
							/>
							{photo.voteCount}
						</Button>
					</div>
				)}

				{/* Image */}
				{inView && !imageError ? (
					<img
						src={photo.filePath}
						alt={photo.title}
						className={cn(
							"w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
							!imageLoaded && "opacity-0",
						)}
						onLoad={() => setImageLoaded(true)}
						onError={() => setImageError(true)}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-gray-200">
						<Eye className="w-8 h-8 text-gray-400" />
					</div>
				)}

				{/* Loading placeholder */}
				{inView && !imageLoaded && !imageError && (
					<div className="absolute inset-0 bg-gray-200 animate-pulse" />
				)}

				{/* Hover overlay */}
				<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />

				{/* Actions overlay */}
				{showActions && (onEdit || onDelete) && (
					<div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
						<div className="flex items-center gap-1">
							{onEdit && (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onEdit(photo.id);
									}}
									className="p-1 h-8 w-8"
								>
									<Edit className="w-4 h-4" />
								</Button>
							)}
							{onDelete && (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(photo.id);
									}}
									className="p-1 h-8 w-8"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Content */}
			<CardContent className="p-3">
				<h3 className="font-medium text-sm truncate group-hover:text-blue-600 transition-colors">
					{photo.title}
				</h3>
				<p className="text-xs text-gray-600">by {photo.photographer.name}</p>

				{photo.competition && (
					<p className="text-xs text-gray-500 truncate mt-1">
						{photo.competition.title}
					</p>
				)}

				{/* Stats */}
				<div className="flex items-center justify-between mt-2 text-xs text-gray-500">
					<span>{new Date(photo.createdAt).toLocaleDateString()}</span>
					{!enableVoting && (
						<div className="flex items-center gap-1">
							<Heart className="w-3 h-3" />
							<span>{photo.voteCount}</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function PhotoGridSkeleton({
	layout,
	size,
}: { layout: "grid" | "list"; size: "sm" | "md" | "lg" }) {
	if (layout === "list") {
		return (
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						<Skeleton
							className={cn(
								"rounded",
								size === "sm" ? "w-16 h-16" : "w-20 h-20",
							)}
						/>
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
							<Skeleton className="h-3 w-1/3" />
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden">
			<Skeleton
				className={cn(
					"w-full",
					size === "sm" ? "aspect-square" : "aspect-[4/3]",
				)}
			/>
			<CardContent className="p-3 space-y-2">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
				<Skeleton className="h-3 w-1/3" />
			</CardContent>
		</Card>
	);
}
