import type React from "react";
import { cn } from "~/lib/utils";

interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
	text?: string;
	className?: string;
}

export function Spacer({ text = "or", className, ...props }: SpacerProps) {
	return (
		<div
			className={cn("relative flex items-center w-full", className)}
			{...props}
		>
			<div className="flex-grow h-px bg-d-green-pri" />
			<div className="px-4 text-d-green-pri mt-[-4px]">{text}</div>
			<div className="flex-grow h-px bg-d-green-pri" />
		</div>
	);
}
