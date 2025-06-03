import { useEffect } from "react";
import { AppLayout } from "../components/app-layout";

import { useRouteLoaderData } from "react-router";

const FeedPage = () => {
	const { user, session } = useRouteLoaderData("root");

	useEffect(() => {
		(async () => {
			console.log("user xx", user, session);
		})();
	}, [user, session]);

	return (
		<AppLayout heading="Feed">
			<div className="flex justify-between items-center mb-4 text-black">
				This is the feed page.
			</div>
		</AppLayout>
	);
};

export default FeedPage;
