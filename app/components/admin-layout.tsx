import {
	BarChart3,
	Camera,
	Flag,
	LucideHome,
	LucideLayoutDashboard,
	LucideMenu,
	LucideSettings,
	Shield,
	Tag,
	Trophy,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";

interface LayoutProps {
	children: ReactNode;
	user?: {
		id: string;
		email: string;
		name: string;
		role: "user" | "admin";
		emailVerified: boolean;
		createdAt: string;
		image?: string;
	} | null;
}

export function AdminLayout({ children, user }: LayoutProps) {
	return (
		<SidebarProvider defaultOpen>
			<div className="flex min-h-screen">
				<Sidebar className="border-r border-border bg-gray-50 dark:bg-gray-900">
					<SidebarHeader className="px-6 py-6">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold">
								App
								<span className="text-blue-600 dark:text-blue-400">Name</span>
							</h2>
							<SidebarTrigger className="ml-auto md:hidden">
								<LucideMenu className="h-5 w-5" />
							</SidebarTrigger>
						</div>
					</SidebarHeader>
					<SidebarContent className="px-3">
						<div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3 px-3">
							Main Navigation
						</div>
						<SidebarMenu>
							<SidebarMenuItem
								href="/"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<LucideHome className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Home
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/dashboard"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<LucideLayoutDashboard className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Dashboard
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/settings"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<LucideSettings className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Settings
							</SidebarMenuItem>
						</SidebarMenu>

						<div className="mt-8 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3 px-3">
							Resources
						</div>
						<SidebarMenu>
							<SidebarMenuItem
								href="/docs"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>File Text</title>
									<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
								</svg>
								Documentation
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/help"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Help Circle</title>
									<circle cx="12" cy="12" r="10" />
									<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
									<path d="M12 17h.01" />
								</svg>
								Help Center
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarContent>
					<SidebarFooter className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4 mx-3">
						<div className="flex items-center space-x-3">
							<div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
								<span className="text-sm font-medium text-blue-600 dark:text-blue-400">
									U
								</span>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									User Name
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									user@example.com
								</p>
							</div>
						</div>
					</SidebarFooter>
				</Sidebar>
				<SidebarInset className="p-6 bg-white dark:bg-gray-950">
					<div className="max-w-7xl mx-auto">{children}</div>
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}
