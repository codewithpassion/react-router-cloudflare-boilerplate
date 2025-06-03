import { trpcServer } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import type { AppType } from "../workers/types";
import { appRouter } from "./trpc/root";
import { createTRPCContext } from "./trpc/trpc";

const app = new Hono<AppType>();

// tRPC endpoint
app.all("/trpc/*", async (c) => {
	const response = await trpcServer({
		router: appRouter,
		createContext: async (opts) => {
			return createTRPCContext({
				env: c.env,
				executionCtx: c.executionCtx,
				request: opts.req,
				user: c.get("user"), // This would come from auth middleware
			});
		},
	})(c.req.raw);

	return response;
});

export { app };
