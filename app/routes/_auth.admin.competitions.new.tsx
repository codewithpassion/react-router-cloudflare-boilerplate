import { ArrowLeft, Eye, Save } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

export default function NewCompetition() {
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		startDate: "",
		endDate: "",
		votingStartDate: "",
		votingEndDate: "",
		status: "draft",
		maxPhotosPerUser: 3,
		categories: [{ name: "General", description: "" }],
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			// TODO: Replace with actual tRPC mutation
			console.log("Creating competition:", formData);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Navigate back to competitions list
			navigate("/admin/competitions");
		} catch (error) {
			console.error("Failed to create competition:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const addCategory = () => {
		setFormData((prev) => ({
			...prev,
			categories: [...prev.categories, { name: "", description: "" }],
		}));
	};

	const removeCategory = (index: number) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.filter((_, i) => i !== index),
		}));
	};

	const updateCategory = (
		index: number,
		field: "name" | "description",
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.map((cat, i) =>
				i === index ? { ...cat, [field]: value } : cat,
			),
		}));
	};

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" asChild>
					<Link to="/admin/competitions">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Competitions
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Create New Competition
					</h1>
					<p className="text-gray-600">Set up a new photo competition</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="title"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Competition Title *
								</label>
								<Input
									id="title"
									value={formData.title}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, title: e.target.value }))
									}
									placeholder="Enter competition title"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="status"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Status
								</label>
								<Select
									value={formData.status}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, status: value }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="draft">Draft</SelectItem>
										<SelectItem value="open">Open for Submissions</SelectItem>
										<SelectItem value="voting">Voting Phase</SelectItem>
										<SelectItem value="closed">Closed</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Description *
							</label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Describe the competition theme, rules, and prizes..."
								rows={4}
								required
							/>
						</div>
					</CardContent>
				</Card>

				{/* Timeline */}
				<Card>
					<CardHeader>
						<CardTitle>Timeline</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="startDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Submission Start Date *
								</label>
								<Input
									id="startDate"
									type="datetime-local"
									value={formData.startDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											startDate: e.target.value,
										}))
									}
									required
								/>
							</div>

							<div>
								<label
									htmlFor="endDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Submission End Date *
								</label>
								<Input
									id="endDate"
									type="datetime-local"
									value={formData.endDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											endDate: e.target.value,
										}))
									}
									required
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="votingStartDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Voting Start Date
								</label>
								<Input
									id="votingStartDate"
									type="datetime-local"
									value={formData.votingStartDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											votingStartDate: e.target.value,
										}))
									}
								/>
							</div>

							<div>
								<label
									htmlFor="votingEndDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Voting End Date
								</label>
								<Input
									id="votingEndDate"
									type="datetime-local"
									value={formData.votingEndDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											votingEndDate: e.target.value,
										}))
									}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Categories */}
				<Card>
					<CardHeader>
						<CardTitle>Categories</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{formData.categories.map((category, index) => (
							<div key={`category-${index}`} className="flex gap-4 items-start">
								<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
									<Input
										value={category.name}
										onChange={(e) =>
											updateCategory(index, "name", e.target.value)
										}
										placeholder="Category name"
										required
									/>
									<Input
										value={category.description}
										onChange={(e) =>
											updateCategory(index, "description", e.target.value)
										}
										placeholder="Category description (optional)"
									/>
								</div>
								{formData.categories.length > 1 && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => removeCategory(index)}
									>
										Remove
									</Button>
								)}
							</div>
						))}

						<Button type="button" variant="outline" onClick={addCategory}>
							Add Category
						</Button>
					</CardContent>
				</Card>

				{/* Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Competition Settings</CardTitle>
					</CardHeader>
					<CardContent>
						<div>
							<label
								htmlFor="maxPhotos"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Maximum Photos per User
							</label>
							<Input
								id="maxPhotos"
								type="number"
								min="1"
								max="10"
								value={formData.maxPhotosPerUser}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										maxPhotosPerUser: Number.parseInt(e.target.value),
									}))
								}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Form Actions */}
				<div className="flex justify-end gap-4 pt-6 border-t">
					<Button type="button" variant="outline" asChild>
						<Link to="/admin/competitions">Cancel</Link>
					</Button>
					<Button type="button" variant="outline">
						<Eye className="w-4 h-4 mr-2" />
						Preview
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
								Creating...
							</>
						) : (
							<>
								<Save className="w-4 h-4 mr-2" />
								Create Competition
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
