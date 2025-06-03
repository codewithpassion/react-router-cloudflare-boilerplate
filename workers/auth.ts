import {
	authAdminSchema,
	getCloudflareSecondaryStorage,
} from "@portcityai/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import type { AppType } from "./types";

export async function authFactory(env: AppType["Bindings"], request: Request) {
	const baseUrl = request.url
		? new URL(request.url).origin
		: "https://example.com";

	if (env?.SESSIONS === undefined) {
		throw new Error("SESSIONS is not defined");
	}

	const db = drizzle(env?.DB);
	const auth = betterAuth({
		database: drizzleAdapter(db, {
			schema: authAdminSchema,
			provider: "sqlite",
		}),

		secondaryStorage: getCloudflareSecondaryStorage({ KV: env?.SESSIONS }),
		emailAndPassword: { enabled: false },
		baseURL: baseUrl,
		secret: env?.BETTER_AUTH_SECRET,
		socialProviders: {},
		plugins: [
			magicLink({
				async sendMagicLink(data) {
					console.log(
						{
							data,
						},
						"Sending magic link",
					);
				},
			}),
		],
	});
	return auth;
}
