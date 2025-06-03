import {
	BarChart3,
	Camera,
	Flag,
	LogOut,
	LucideLayoutDashboard,
	LucideMenu,
	LucideSettings,
	Shield,
	Tag,
	Trophy,
	User,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
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
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	user?: any;
}

export function AdminLayout({ children, user }: LayoutProps) {
	return (
		<SidebarProvider defaultOpen>
			<div className="flex min-h-screen">
				<Sidebar className="border-r border-border bg-gray-50 dark:bg-gray-900">
					<SidebarHeader className="px-6 py-6">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold">
								Photo
								<span className="text-blue-600 dark:text-blue-400">
									Compete
								</span>
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
								href="/admin/dashboard"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<LucideLayoutDashboard className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Dashboard
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/admin/competitions"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<Trophy className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Competitions
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/admin/categories"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<Tag className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Categories
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/admin/users"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<Users className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Users
							</SidebarMenuItem>
						</SidebarMenu>

						<div className="mt-8 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3 px-3">
							Moderation
						</div>
						<SidebarMenu>
							<SidebarMenuItem
								href="/admin/moderation"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<Camera className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Photo Queue
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/admin/reports"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<Flag className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Reports
							</SidebarMenuItem>
							<SidebarMenuItem
								href="/admin/analytics"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<BarChart3 className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Analytics
							</SidebarMenuItem>
						</SidebarMenu>

						<div className="mt-8 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3 px-3">
							System
						</div>
						<SidebarMenu>
							<SidebarMenuItem
								href="/admin/settings"
								className="mb-1.5 font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors"
							>
								<LucideSettings className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Settings
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarContent>
					<SidebarFooter className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4 mx-3">
						<div className="space-y-2">
							<div className="flex items-center space-x-3">
								<div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
									<User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
										{user?.name || "Admin User"}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
										{user?.email || "admin@example.com"}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm" className="flex-1" asChild>
									<Link to="/dashboard">
										<Shield className="w-4 h-4 mr-2" />
										User View
									</Link>
								</Button>
								<Button variant="ghost" size="sm" asChild>
									<Link to="/logout">
										<LogOut className="w-4 h-4" />
									</Link>
								</Button>
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
