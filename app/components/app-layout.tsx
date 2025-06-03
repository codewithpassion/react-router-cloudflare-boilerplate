import type { ReactNode } from "react";
import { Link } from "react-router";
import { Image } from "./ui/image";

interface LayoutProps {
	children: ReactNode;
	heading: string;
	subHeading?: string;
}

export function AppLayout({ children, heading, subHeading }: LayoutProps) {
	return (
		<div className="flex h-screen w-full bg-white p-8 flex-col">
			<div className="mb-6 md:mb-12 text-center relative">
				<div className="z-10 relative">
					<div className={"justify-center mb-6 flex"}>
						<div className="w-16 h-16 flex items-center justify-center">
							<Link to="/feed">
								<Image alt="Feed" src="https://placehold.co/64" />
							</Link>
						</div>
					</div>
					<h1 className="main-heading">{heading}</h1>
					{subHeading && <p className="text-xl font-semibold">{subHeading}</p>}
				</div>
				<div className="absolute -top-8  left-1/2 -ml-2.5 transform -translate-x-1/2 w-full h-screen py-12 z-0">
					{/* <Image
						alt="Background"
						src="https://placehold.co/64"
						className="h-full w-full"
					/> */}
				</div>
			</div>
			<div className="z-10 w-full text-text">{children}</div>
		</div>
	);
}
