import type { ReactNode } from "react";

interface LayoutProps {
	children: ReactNode;
}
export function SiteLayout({ children }: LayoutProps) {
	return <>{children}</>;
}
