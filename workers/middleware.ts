import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";

import type { AppType } from "./types";

import { authAdminSchema } from "@portcityai/better-auth";

const D1DbMiddleware = createMiddleware<AppType>(async (c, next) => {
	const db = drizzle(c.env.DB);
	const baseUrl = c?.req.url
		? new URL(c.req.url).origin
		: "https://example.com";
	c.set("Database", {
		client: db,
		seed: async () => {
			const users = await c.var.Database.client
				.select()
				.from(authAdminSchema.user);
			if (users.length > 0) {
				console.log("Database already seeded");
				return;
			}
			console.log("Seeding database with super admin");
			await c.var.Database.client
				.insert(authAdminSchema.user)
				.values({
					id: "admin",
					name: "Dominik Fretz",
					email: "dominik@portcityai.com",
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					role: "admin",
				})
				.run();
		},
	});
	await next();
});

export { D1DbMiddleware };
