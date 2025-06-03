import type React from "react";
import type { JSX, ReactNode } from "react";
import {
	type AppLoadContext,
	type LoaderFunctionArgs,
	Outlet,
	redirect,
} from "react-router";
import { authFactory } from "~~/auth";

export async function loader(args: LoaderFunctionArgs) {
	const c: AppLoadContext = args.context;

	const session = await (
		await authFactory(c.cloudflare.env, args.request)
	).api.getSession({
		headers: args.request.headers,
	});

	if (!session || !session.user) {
		return redirect("/login");
	}
}

export default function Protected() {
	return (
		<>
			<Outlet />
		</>
	);
}
