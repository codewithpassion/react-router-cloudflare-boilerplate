import { CirclePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/app-layout";
import { Button } from "../components/ui/button";

import {
	type HeadersArgs,
	Link,
	type LoaderFunctionArgs,
	data,
	redirect,
	useMatches,
	useRouteLoaderData,
} from "react-router";

export async function loader({ context, params }: LoaderFunctionArgs) {
	console.log("Loader context", params);
}

const FeedPage = () => {
	const { user, session } = useRouteLoaderData("root");

	useEffect(() => {
		(async () => {
			console.log("user xx", user, session);
		})();
	}, [user, session]);

	// State for projects data - setProjects can be used for future updates
	const [projects, setProjects] = useState([
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
		{
			title: "Title Heading",
			date: "Date",
			description: "Today I have a DSA Assignments 2 and...",
		},
	]);
	return (
		<AppLayout heading="Feed">
			<div className="flex justify-between items-center mb-4 text-black">
				This is the feed page.
			</div>
		</AppLayout>
	);
};

export default FeedPage;
