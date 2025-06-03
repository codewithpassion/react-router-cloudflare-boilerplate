import type { ReactNode } from "react";
import { Image } from "./ui/image";

interface LayoutProps {
	children: ReactNode;
}

export function LoginLayout({ children }: LayoutProps) {
	return (
		<div className="flex h-screen w-full bg-l-green-pri flex-col-reverse  md:flex-row">
			{/* Left side - Content area */}
			<div className="w-full h:1/2 md:h-full md:w-1/2 min-h-[50vh] bg-white p-4 md:p-8 flex items-start md:items-center justify-center rounded-t-3xl md:rounded-r-3xl md:rounded-t-none drop-shadow-2xl">
				<div className="w-full max-w-md mx-12">{children}</div>
			</div>

			{/* Right/Top side - Decorative area */}
			<div className="w-full h:1/2 md:h-full md:w-1/2  flex flex-col items-center justify-center relative overflow-hidden">
				{/* Logo */}
				<Image
					alt="Login"
					src="https://placehold.co/800x1200"
					className="h-24 mb-6 md:mb-12"
				/>
			</div>
		</div>
	);
}
