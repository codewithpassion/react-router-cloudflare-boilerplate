import { AlertCircle, Check, Image, Upload, X } from "lucide-react";
import { forwardRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface FileDropzoneProps {
	onFilesSelected: (files: File[]) => void;
	accept?: Record<string, string[]>;
	multiple?: boolean;
	maxSize?: number; // in bytes
	maxFiles?: number;
	disabled?: boolean;
	className?: string;
	showPreview?: boolean;
}

interface FileWithPreview extends File {
	preview?: string;
}

export const FileDropzone = forwardRef<HTMLDivElement, FileDropzoneProps>(
	(
		{
			onFilesSelected,
			accept = { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
			multiple = false,
			maxSize = 10 * 1024 * 1024, // 10MB
			maxFiles = 1,
			disabled = false,
			className,
			showPreview = false,
		},
		ref,
	) => {
		const [errors, setErrors] = useState<string[]>([]);
		const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

		const onDrop = (acceptedFiles: File[], rejectedFiles: any[]) => {
			setErrors([]);

			// Handle rejected files
			if (rejectedFiles.length > 0) {
				const newErrors: string[] = [];
				rejectedFiles.forEach((rejection) => {
					rejection.errors.forEach((error: any) => {
						switch (error.code) {
							case "file-too-large":
								newErrors.push(
									`File ${rejection.file.name} is too large. Maximum size is ${
										maxSize / 1024 / 1024
									}MB.`,
								);
								break;
							case "file-invalid-type":
								newErrors.push(
									`File ${rejection.file.name} is not a supported image format.`,
								);
								break;
							case "too-many-files":
								newErrors.push(
									`Too many files. Maximum allowed is ${maxFiles}.`,
								);
								break;
							default:
								newErrors.push(
									`Error with file ${rejection.file.name}: ${error.message}`,
								);
						}
					});
				});
				setErrors(newErrors);
			}

			// Handle accepted files
			if (acceptedFiles.length > 0) {
				const filesWithPreview = acceptedFiles.map((file) => {
					const fileWithPreview = file as FileWithPreview;
					if (showPreview && file.type.startsWith("image/")) {
						fileWithPreview.preview = URL.createObjectURL(file);
					}
					return fileWithPreview;
				});

				setSelectedFiles(filesWithPreview);
				onFilesSelected(acceptedFiles);
			}
		};

		const {
			getRootProps,
			getInputProps,
			isDragActive,
			isDragAccept,
			isDragReject,
		} = useDropzone({
			onDrop,
			accept,
			multiple,
			maxSize,
			maxFiles,
			disabled,
		});

		const removeFile = (index: number) => {
			const newFiles = selectedFiles.filter((_, i) => i !== index);
			setSelectedFiles(newFiles);
			onFilesSelected(newFiles);

			// Clean up object URLs
			if (selectedFiles[index].preview) {
				URL.revokeObjectURL(selectedFiles[index].preview!);
			}
		};

		const dropzoneClass = cn(
			"relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
			"hover:border-primary/50 hover:bg-primary/5",
			"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
			{
				"border-primary bg-primary/10": isDragAccept,
				"border-red-500 bg-red-50": isDragReject,
				"border-gray-300": !isDragActive && !isDragAccept && !isDragReject,
				"opacity-50 cursor-not-allowed": disabled,
			},
			className,
		);

		return (
			<div ref={ref} className="space-y-4">
				<div {...getRootProps({ className: dropzoneClass })}>
					<input {...getInputProps()} />
					<div className="space-y-4">
						<div className="mx-auto w-12 h-12 text-gray-400">
							{isDragActive ? (
								<Upload className="w-full h-full" />
							) : (
								<Image className="w-full h-full" />
							)}
						</div>

						<div className="space-y-2">
							<p className="text-lg font-medium">
								{isDragActive
									? "Drop files here"
									: "Click to upload or drag and drop"}
							</p>
							<p className="text-sm text-gray-500">
								{multiple
									? `Upload up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}`
									: "Upload one image"}
							</p>
							<p className="text-xs text-gray-400">
								PNG, JPG, JPEG or WebP (max {Math.round(maxSize / 1024 / 1024)}
								MB each)
							</p>
						</div>

						{isDragActive && (
							<div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
								<div className="text-center">
									<Upload className="w-8 h-8 mx-auto text-primary" />
									<p className="mt-2 text-primary font-medium">
										Release to upload
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Error Messages */}
				{errors.length > 0 && (
					<div className="space-y-2">
						{errors.map((error, index) => (
							<div
								key={index}
								className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-md"
							>
								<AlertCircle className="w-4 h-4 flex-shrink-0" />
								<span>{error}</span>
							</div>
						))}
					</div>
				)}

				{/* File Previews */}
				{showPreview && selectedFiles.length > 0 && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium">Selected Files</h4>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{selectedFiles.map((file, index) => (
								<div
									key={index}
									className="relative group border rounded-lg overflow-hidden bg-gray-50"
								>
									{file.preview ? (
										<img
											src={file.preview}
											alt={file.name}
											className="w-full h-24 object-cover"
											onLoad={() => {
												// Clean up object URL after image loads
												URL.revokeObjectURL(file.preview!);
											}}
										/>
									) : (
										<div className="w-full h-24 flex items-center justify-center bg-gray-100">
											<Image className="w-6 h-6 text-gray-400" />
										</div>
									)}

									<div className="p-2">
										<p
											className="text-xs font-medium truncate"
											title={file.name}
										>
											{file.name}
										</p>
										<p className="text-xs text-gray-500">
											{(file.size / 1024 / 1024).toFixed(1)} MB
										</p>
									</div>

									<Button
										type="button"
										variant="destructive"
										size="sm"
										className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={(e) => {
											e.stopPropagation();
											removeFile(index);
										}}
									>
										<X className="w-3 h-3" />
									</Button>

									<div className="absolute bottom-1 left-1">
										<div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
											<Check className="w-3 h-3 text-white" />
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	},
);

FileDropzone.displayName = "FileDropzone";
