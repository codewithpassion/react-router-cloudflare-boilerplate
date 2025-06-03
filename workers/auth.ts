import {
	authAdminSchema,
	getCloudflareSecondaryStorage,
} from "@portcityai/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { MockEmailService, ResendEmailService } from "./services/email";
import type { AppType } from "./types";

export async function authFactory(env: AppType["Bindings"], request: Request) {
	const baseUrl = request.url
		? new URL(request.url).origin
		: "https://example.com";

	if (env?.SESSIONS === undefined) {
		throw new Error("SESSIONS is not defined");
	}

	const emailService = env.RESEND_API_KEY
		? new ResendEmailService(env)
		: new MockEmailService();

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
					const result = await emailService.sendMagicLink({
						email: data.email,
						magicLink: data.url,
						ipAddress:
							request.headers.get("CF-Connecting-IP") ||
							request.headers.get("X-Forwarded-For") ||
							"unknown",
						userAgent: request.headers.get("User-Agent") || undefined,
					});

					if (!result.success) {
						console.error("Failed to send magic link email:", result.error);
						throw new Error(
							"Failed to send verification email. Please try again.",
						);
					}

					console.log("Magic link email sent successfully:", {
						email: data.email,
						messageId: result.messageId,
					});
				},
			}),
		],
	});
	return auth;
}
