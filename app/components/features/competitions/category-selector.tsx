import { Check } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface Category {
	id: string;
	name: string;
	description: string;
	maxPhotosPerUser: number;
	maxPhotosTotal?: number;
	rules?: string[];
	examples?: string[];
}

interface CategorySelectorProps {
	categories: Category[];
	submissionCounts: Record<string, number>;
	onCategorySelect: (category: Category) => void;
	selectedCategory?: Category;
	className?: string;
}

export function CategorySelector({
	categories,
	submissionCounts,
	onCategorySelect,
	selectedCategory,
	className,
}: CategorySelectorProps) {
	if (categories.length === 0) {
		return (
			<div className={cn("text-center py-8", className)}>
				<p className="text-gray-500">
					No categories available for this competition.
				</p>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			<div>
				<h3 className="text-lg font-medium mb-2">Select Category</h3>
				<p className="text-sm text-gray-600">
					Choose a category for your photo submission. You can submit multiple
					photos per category up to the limit.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{categories.map((category) => {
					const currentCount = submissionCounts[category.id] || 0;
					const isAvailable = currentCount < category.maxPhotosPerUser;
					const isSelected = selectedCategory?.id === category.id;

					return (
						<Card
							key={category.id}
							className={cn(
								"relative cursor-pointer transition-all duration-200 hover:shadow-md",
								isSelected && "ring-2 ring-blue-500 shadow-lg",
								!isAvailable && "opacity-50 cursor-not-allowed",
								isAvailable && "hover:border-blue-300",
							)}
							onClick={() => isAvailable && onCategorySelect(category)}
						>
							<CardContent className="p-6">
								{/* Selection indicator */}
								{isSelected && (
									<div className="absolute top-3 right-3">
										<div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
									</div>
								)}

								{/* Category Header */}
								<div className="mb-4">
									<h4 className="text-lg font-semibold mb-2">
										{category.name}
									</h4>
									<p className="text-sm text-gray-600 leading-relaxed">
										{category.description}
									</p>
								</div>

								{/* Submission Status */}
								<div className="mb-4">
									<div className="flex items-center justify-between text-sm mb-2">
										<span className="text-gray-600">Your submissions:</span>
										<span
											className={cn(
												"font-medium px-2 py-1 rounded-full text-xs",
												isAvailable
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700",
											)}
										>
											{currentCount}/{category.maxPhotosPerUser}
										</span>
									</div>

									{/* Progress bar */}
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className={cn(
												"h-2 rounded-full transition-all",
												currentCount === 0
													? "bg-gray-300"
													: currentCount < category.maxPhotosPerUser
														? "bg-blue-500"
														: "bg-red-500",
											)}
											style={{
												width: `${(currentCount / category.maxPhotosPerUser) * 100}%`,
											}}
										/>
									</div>

									{!isAvailable && (
										<p className="text-xs text-red-600 mt-2">
											Maximum submissions reached for this category
										</p>
									)}
								</div>

								{/* Category Rules */}
								{category.rules && category.rules.length > 0 && (
									<div className="mb-4">
										<h5 className="text-sm font-medium text-gray-700 mb-2">
											Rules:
										</h5>
										<ul className="text-xs text-gray-600 space-y-1">
											{category.rules.slice(0, 3).map((rule, index) => (
												<li key={index} className="flex items-start gap-2">
													<span className="text-blue-500 mt-1">•</span>
													<span>{rule}</span>
												</li>
											))}
											{category.rules.length > 3 && (
												<li className="text-gray-500 italic">
													+{category.rules.length - 3} more rules...
												</li>
											)}
										</ul>
									</div>
								)}

								{/* Examples */}
								{category.examples && category.examples.length > 0 && (
									<div>
										<h5 className="text-sm font-medium text-gray-700 mb-2">
											Examples:
										</h5>
										<div className="flex flex-wrap gap-1">
											{category.examples.slice(0, 3).map((example, index) => (
												<span
													key={index}
													className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
												>
													{example}
												</span>
											))}
											{category.examples.length > 3 && (
												<span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
													+{category.examples.length - 3}
												</span>
											)}
										</div>
									</div>
								)}

								{/* Total submissions info */}
								{category.maxPhotosTotal && (
									<div className="mt-4 pt-4 border-t border-gray-100">
										<p className="text-xs text-gray-500">
											Total category limit: {category.maxPhotosTotal} photos
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Selection Summary */}
			{selectedCategory && (
				<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<div className="flex items-start gap-3">
						<div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
							<Check className="w-4 h-4 text-white" />
						</div>
						<div>
							<h4 className="font-medium text-blue-900">
								Selected: {selectedCategory.name}
							</h4>
							<p className="text-sm text-blue-700 mt-1">
								{selectedCategory.description}
							</p>
							<div className="text-xs text-blue-600 mt-2">
								You can submit{" "}
								{selectedCategory.maxPhotosPerUser -
									(submissionCounts[selectedCategory.id] || 0)}{" "}
								more photo
								{selectedCategory.maxPhotosPerUser -
									(submissionCounts[selectedCategory.id] || 0) ===
								1
									? ""
									: "s"}{" "}
								in this category.
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
