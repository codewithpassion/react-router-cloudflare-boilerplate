import {
	type AppLoadContext,
	type LoaderFunctionArgs,
	redirect,
} from "react-router";
import { authFactory } from "~~/auth";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Login" },
		{ name: "description", content: "Login to access your account" },
	];
}

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
	return redirect("/feed");
}

export default function index() {
	return <>index</>;
}
