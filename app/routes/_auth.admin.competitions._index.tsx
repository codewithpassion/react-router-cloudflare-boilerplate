import { Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CompetitionCard } from "~/components/features/competitions/competition-card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";

// Mock data for demonstration - replace with actual tRPC queries
const mockCompetitions = [
	{
		id: "1",
		title: "Nature Photography Contest",
		description:
			"Capture the beauty of nature in all its forms. From landscapes to wildlife, show us the natural world through your lens.",
		startDate: "2024-01-01",
		endDate: "2024-02-28",
		status: "open" as const,
		_count: {
			photos: 45,
			votes: 892,
		},
		categories: [
			{ id: "1", name: "Landscapes" },
			{ id: "2", name: "Wildlife" },
		],
	},
	{
		id: "2",
		title: "Street Photography Challenge",
		description:
			"Document life as it happens on the streets. Capture candid moments, urban scenes, and the energy of city life.",
		startDate: "2024-02-01",
		endDate: "2024-03-15",
		status: "voting" as const,
		_count: {
			photos: 78,
			votes: 1245,
		},
		categories: [
			{ id: "3", name: "Urban Life" },
			{ id: "4", name: "Candid Moments" },
		],
	},
	{
		id: "3",
		title: "Portrait Masters",
		description:
			"The art of capturing human emotion and character through portraiture.",
		startDate: "2024-03-01",
		endDate: "2024-04-30",
		status: "draft" as const,
		_count: {
			photos: 0,
			votes: 0,
		},
		categories: [
			{ id: "5", name: "Studio Portraits" },
			{ id: "6", name: "Environmental Portraits" },
		],
	},
];

export default function AdminCompetitions() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sortBy, setSortBy] = useState("date");

	const filteredCompetitions = mockCompetitions.filter((competition) => {
		const matchesSearch =
			competition.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			competition.description.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || competition.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const handleEdit = (id: string) => {
		// Navigate to edit page
		console.log("Edit competition:", id);
	};

	const handleDelete = (id: string) => {
		// Handle delete with confirmation
		console.log("Delete competition:", id);
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Competition Management
					</h1>
					<p className="text-gray-600">Create and manage photo competitions</p>
				</div>
				<Button asChild>
					<Link to="/admin/competitions/new">
						<Plus className="w-4 h-4 mr-2" />
						Create Competition
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-lg border space-y-4">
				<div className="flex flex-col sm:flex-row gap-4">
					{/* Search */}
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<Input
							placeholder="Search competitions..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Status Filter */}
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full sm:w-40">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="voting">Voting</SelectItem>
							<SelectItem value="closed">Closed</SelectItem>
						</SelectContent>
					</Select>

					{/* Sort */}
					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full sm:w-40">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="date">Date Created</SelectItem>
							<SelectItem value="title">Title</SelectItem>
							<SelectItem value="status">Status</SelectItem>
							<SelectItem value="entries">Entry Count</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Competitions Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredCompetitions.map((competition) => (
					<CompetitionCard
						key={competition.id}
						competition={competition}
						showActions={true}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onClick={() => console.log("View competition:", competition.id)}
					/>
				))}
			</div>

			{filteredCompetitions.length === 0 && (
				<div className="text-center py-12">
					<div className="text-gray-500 mb-4">
						{searchQuery || statusFilter !== "all"
							? "No competitions match your filters"
							: "No competitions found"}
					</div>
					{!searchQuery && statusFilter === "all" && (
						<Button asChild>
							<Link to="/admin/competitions/new">
								<Plus className="w-4 h-4 mr-2" />
								Create Your First Competition
							</Link>
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
