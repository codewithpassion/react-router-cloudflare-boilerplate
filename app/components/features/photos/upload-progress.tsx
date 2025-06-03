import { AlertCircle, CheckCircle, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface UploadFile {
	id: string;
	file: File;
	progress: number;
	status: "pending" | "uploading" | "processing" | "completed" | "error";
	error?: string;
	preview?: string;
	uploadedUrl?: string;
}

interface UploadProgressProps {
	files: UploadFile[];
	onRemove: (fileId: string) => void;
	onRetry: (fileId: string) => void;
	showPreviews?: boolean;
	compact?: boolean;
}

export function UploadProgress({
	files,
	onRemove,
	onRetry,
	showPreviews = true,
	compact = false,
}: UploadProgressProps) {
	if (files.length === 0) {
		return null;
	}

	const completedCount = files.filter((f) => f.status === "completed").length;
	const errorCount = files.filter((f) => f.status === "error").length;
	const uploadingCount = files.filter((f) =>
		["uploading", "processing"].includes(f.status),
	).length;

	const overallProgress =
		files.reduce((acc, file) => acc + file.progress, 0) / files.length;

	return (
		<Card className="w-full">
			<CardContent className="p-4 space-y-4">
				{/* Overall Progress Summary */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="font-medium">
							Upload Progress ({completedCount}/{files.length})
						</span>
						<span className="text-gray-500">
							{Math.round(overallProgress)}%
						</span>
					</div>

					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className={cn(
								"h-2 rounded-full transition-all duration-300",
								errorCount > 0
									? "bg-red-500"
									: overallProgress === 100
										? "bg-green-500"
										: "bg-blue-500",
							)}
							style={{ width: `${overallProgress}%` }}
						/>
					</div>

					{/* Status Summary */}
					<div className="flex items-center gap-4 text-xs text-gray-600">
						{uploadingCount > 0 && (
							<span className="flex items-center gap-1">
								<Loader2 className="w-3 h-3 animate-spin" />
								{uploadingCount} uploading
							</span>
						)}
						{completedCount > 0 && (
							<span className="flex items-center gap-1 text-green-600">
								<CheckCircle className="w-3 h-3" />
								{completedCount} completed
							</span>
						)}
						{errorCount > 0 && (
							<span className="flex items-center gap-1 text-red-600">
								<AlertCircle className="w-3 h-3" />
								{errorCount} failed
							</span>
						)}
					</div>
				</div>

				{/* Individual File Progress */}
				<div className={cn("space-y-3", compact && "space-y-2")}>
					{files.map((file) => (
						<FileProgressItem
							key={file.id}
							file={file}
							onRemove={onRemove}
							onRetry={onRetry}
							showPreview={showPreviews}
							compact={compact}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

interface FileProgressItemProps {
	file: UploadFile;
	onRemove: (fileId: string) => void;
	onRetry: (fileId: string) => void;
	showPreview: boolean;
	compact: boolean;
}

function FileProgressItem({
	file,
	onRemove,
	onRetry,
	showPreview,
	compact,
}: FileProgressItemProps) {
	const getStatusIcon = () => {
		switch (file.status) {
			case "pending":
				return (
					<div className="w-4 h-4 rounded-full border-2 border-gray-300" />
				);
			case "uploading":
			case "processing":
				return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
			case "completed":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "error":
				return <AlertCircle className="w-4 h-4 text-red-500" />;
			default:
				return null;
		}
	};

	const getStatusText = () => {
		switch (file.status) {
			case "pending":
				return "Waiting...";
			case "uploading":
				return "Uploading...";
			case "processing":
				return "Processing...";
			case "completed":
				return "Complete";
			case "error":
				return "Failed";
			default:
				return "";
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	};

	return (
		<div
			className={cn(
				"flex items-center gap-3 p-3 border rounded-lg bg-white",
				file.status === "error" && "border-red-200 bg-red-50",
				file.status === "completed" && "border-green-200 bg-green-50",
				compact && "p-2",
			)}
		>
			{/* Preview Image */}
			{showPreview && !compact && (
				<div className="flex-shrink-0">
					{file.preview ? (
						<img
							src={file.preview}
							alt={file.file.name}
							className="w-12 h-12 object-cover rounded border"
						/>
					) : (
						<div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
							<span className="text-xs text-gray-500">IMG</span>
						</div>
					)}
				</div>
			)}

			{/* File Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					{getStatusIcon()}
					<span
						className={cn(
							"font-medium truncate",
							compact ? "text-sm" : "text-base",
						)}
						title={file.file.name}
					>
						{file.file.name}
					</span>
				</div>

				<div
					className={cn(
						"flex items-center gap-4",
						compact ? "text-xs" : "text-sm",
					)}
				>
					<span className="text-gray-500">
						{formatFileSize(file.file.size)}
					</span>
					<span
						className={cn(
							file.status === "error" && "text-red-600",
							file.status === "completed" && "text-green-600",
							file.status === "uploading" && "text-blue-600",
						)}
					>
						{getStatusText()}
					</span>
				</div>

				{/* Progress Bar */}
				{["uploading", "processing"].includes(file.status) && (
					<div className="mt-2">
						<div className="w-full bg-gray-200 rounded-full h-1.5">
							<div
								className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
								style={{ width: `${file.progress}%` }}
							/>
						</div>
						<div className="flex justify-between text-xs text-gray-500 mt-1">
							<span>{file.progress}%</span>
							{file.status === "processing" && <span>Processing image...</span>}
						</div>
					</div>
				)}

				{/* Error Message */}
				{file.status === "error" && file.error && (
					<div className="mt-2 text-sm text-red-600">{file.error}</div>
				)}
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1">
				{file.status === "error" && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onRetry(file.id)}
						className="p-1 h-8 w-8"
					>
						<RefreshCw className="w-3 h-3" />
					</Button>
				)}

				{file.status !== "uploading" && file.status !== "processing" && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onRemove(file.id)}
						className="p-1 h-8 w-8 text-gray-500 hover:text-red-600"
					>
						<X className="w-3 h-3" />
					</Button>
				)}
			</div>
		</div>
	);
}
