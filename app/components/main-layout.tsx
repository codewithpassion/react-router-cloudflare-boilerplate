import {
	Camera,
	Image as ImageIcon,
	LogOut,
	Menu,
	Settings,
	Trophy,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/hooks/use-auth";
import { cn } from "~/lib/utils";

interface MainLayoutProps {
	children: React.ReactNode;
}

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: Settings, authRequired: true },
	{ name: "Competitions", href: "/competitions", icon: Trophy },
	{ name: "Gallery", href: "/gallery", icon: ImageIcon },
	{ name: "My Photos", href: "/photos", icon: Camera, authRequired: true },
];

const adminNavigation = [
	{ name: "Admin Dashboard", href: "/admin/dashboard", icon: Settings },
	{ name: "Manage Competitions", href: "/admin/competitions", icon: Trophy },
	{ name: "Moderation", href: "/admin/moderation", icon: Camera },
];

export function MainLayout({ children }: MainLayoutProps) {
	const { user, isAuthenticated, isAdmin } = useAuth();
	const location = useLocation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const filteredNavigation = navigation.filter(
		(item) => !item.authRequired || isAuthenticated,
	);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Navigation Header */}
			<nav className="bg-white shadow-sm border-b">
				<div className="container mx-auto px-4">
					<div className="flex justify-between items-center h-16">
						{/* Logo */}
						<Link to="/" className="flex items-center space-x-2">
							<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
								<Camera className="w-5 h-5 text-white" />
							</div>
							<span className="text-xl font-bold">
								Photo<span className="text-blue-600">Compete</span>
							</span>
						</Link>

						{/* Desktop Navigation */}
						<div className="hidden md:flex items-center space-x-8">
							{filteredNavigation.map((item) => {
								const isActive =
									location.pathname === item.href ||
									(item.href !== "/" &&
										location.pathname.startsWith(item.href));
								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											"flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
											isActive
												? "text-blue-600 bg-blue-50"
												: "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
										)}
									>
										<item.icon className="w-4 h-4" />
										<span>{item.name}</span>
									</Link>
								);
							})}
						</div>

						{/* User Menu */}
						<div className="hidden md:flex items-center space-x-4">
							{isAuthenticated ? (
								<div className="flex items-center space-x-3">
									{isAdmin && (
										<div className="flex items-center space-x-2">
											{adminNavigation.map((item) => (
												<Link
													key={item.name}
													to={item.href}
													className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
												>
													<item.icon className="w-3 h-3" />
													<span className="hidden lg:inline">{item.name}</span>
												</Link>
											))}
										</div>
									)}

									<div className="flex items-center space-x-2">
										<div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
											<User className="w-4 h-4 text-gray-600" />
										</div>
										<div className="hidden lg:block">
											<p className="text-sm font-medium text-gray-900">
												{user?.name}
											</p>
											<p className="text-xs text-gray-500">{user?.email}</p>
										</div>
									</div>

									<Button variant="ghost" size="sm" asChild>
										<Link to="/logout">
											<LogOut className="w-4 h-4" />
										</Link>
									</Button>
								</div>
							) : (
								<div className="flex items-center space-x-2">
									<Button variant="ghost" asChild>
										<Link to="/login">Sign In</Link>
									</Button>
									<Button asChild>
										<Link to="/signup">Sign Up</Link>
									</Button>
								</div>
							)}
						</div>

						{/* Mobile Menu Button */}
						<div className="md:hidden">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							>
								{mobileMenuOpen ? (
									<X className="w-5 h-5" />
								) : (
									<Menu className="w-5 h-5" />
								)}
							</Button>
						</div>
					</div>
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden border-t bg-white">
						<div className="px-4 py-3 space-y-3">
							{filteredNavigation.map((item) => {
								const isActive =
									location.pathname === item.href ||
									(item.href !== "/" &&
										location.pathname.startsWith(item.href));
								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											"flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium",
											isActive ? "text-blue-600 bg-blue-50" : "text-gray-600",
										)}
										onClick={() => setMobileMenuOpen(false)}
									>
										<item.icon className="w-4 h-4" />
										<span>{item.name}</span>
									</Link>
								);
							})}

							{isAuthenticated ? (
								<div className="pt-3 border-t space-y-2">
									<div className="flex items-center space-x-2 px-3 py-2">
										<div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
											<User className="w-4 h-4 text-gray-600" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900">
												{user?.name}
											</p>
											<p className="text-xs text-gray-500">{user?.email}</p>
										</div>
									</div>

									{isAdmin && (
										<div className="space-y-1">
											<p className="text-xs text-gray-500 uppercase tracking-wider px-3">
												Admin
											</p>
											{adminNavigation.map((item) => (
												<Link
													key={item.name}
													to={item.href}
													className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600"
													onClick={() => setMobileMenuOpen(false)}
												>
													<item.icon className="w-4 h-4" />
													<span>{item.name}</span>
												</Link>
											))}
										</div>
									)}

									<Link
										to="/logout"
										className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600"
										onClick={() => setMobileMenuOpen(false)}
									>
										<LogOut className="w-4 h-4" />
										<span>Sign Out</span>
									</Link>
								</div>
							) : (
								<div className="pt-3 border-t space-y-2">
									<Link
										to="/login"
										className="block px-3 py-2 text-sm font-medium text-gray-600"
										onClick={() => setMobileMenuOpen(false)}
									>
										Sign In
									</Link>
									<Link
										to="/signup"
										className="block px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md"
										onClick={() => setMobileMenuOpen(false)}
									>
										Sign Up
									</Link>
								</div>
							)}
						</div>
					</div>
				)}
			</nav>

			{/* Main Content */}
			<main className="flex-1">{children}</main>

			{/* Footer */}
			<footer className="bg-white border-t mt-auto">
				<div className="container mx-auto px-4 py-8">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="flex items-center space-x-2 mb-4 md:mb-0">
							<div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
								<Camera className="w-4 h-4 text-white" />
							</div>
							<span className="font-semibold">
								Photo<span className="text-blue-600">Compete</span>
							</span>
						</div>
						<div className="flex items-center space-x-6 text-sm text-gray-600">
							<Link to="/about" className="hover:text-gray-900">
								About
							</Link>
							<Link to="/terms" className="hover:text-gray-900">
								Terms
							</Link>
							<Link to="/privacy" className="hover:text-gray-900">
								Privacy
							</Link>
							<Link to="/contact" className="hover:text-gray-900">
								Contact
							</Link>
						</div>
					</div>
					<div className="mt-4 pt-4 border-t text-center text-sm text-gray-500">
						© 2024 PhotoCompete. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	);
}
