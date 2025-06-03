import { createMiddleware } from "hono/factory";
import { addCloudflareContextToNodejsGlobal } from "./cloudflare";
import * as authSchema from "./db/auth-schema";
import * as authAdminSchema from "./db/auth-schema-admin";
import { getCloudflareSecondaryStorage } from "./kv-secondary-storage";
import { AuthCloudflareBindings } from "./types";

type AppType = {
	Bindings: AuthCloudflareBindings;
};

const cloudflareContextMiddleware = createMiddleware<AppType>(
	async (c, next) => {
		addCloudflareContextToNodejsGlobal({
			cf: c.req.raw.cf,
			env: c.env,
			ctx: c.executionCtx,
			req: c.req.raw,
		});
		return next();
	},
);

const dbLoader = () => {
	return import("./db").then((db) => db.kyselyDb);
};

export {
	cloudflareContextMiddleware,
	getCloudflareSecondaryStorage,
	authSchema,
	authAdminSchema,
	AuthCloudflareBindings,
	dbLoader,
};
