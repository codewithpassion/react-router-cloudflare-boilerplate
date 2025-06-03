/// <reference path="../worker-configuration.d.ts" />
import { Hono } from "hono";
import { cloudflareContextMiddleware } from "packages/better-auth";
import { type AppLoadContext, createRequestHandler } from "react-router";
import { authFactory } from "~~/auth";
import { D1DbMiddleware } from "./middleware";
import type { AppType } from "./types";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: CloudflareEnvironment;
			var: CloudflareVariables;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	// @ts-ignore
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

const app = new Hono<AppType>();

app.use(cloudflareContextMiddleware);
app.use(D1DbMiddleware);

app.get("/api/health", (c) => {
	return c.json({ status: "ok" });
});

app.get("/api/seed", async (c) => {
	await c.var.Database.seed();
	return c.json({ status: "ok" });
});

// Authentication routes
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	return (await authFactory(c.env, c.req.raw)).handler(c.req.raw);
});

app.use(async (c) => {
	const reactRouterContext = {
		cloudflare: {
			env: c.env,
			var: c.var,
			ctx: c.executionCtx,
		},
	} as unknown as AppLoadContext;
	return requestHandler(c.req.raw, reactRouterContext);
});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<CloudflareEnvironment>;
