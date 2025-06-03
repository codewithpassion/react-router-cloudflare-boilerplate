import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { getCloudflareContext } from "./cloudflare";
import { kyselyDb } from "./db";
import * as authSchema from "./db/auth-schema";

const context = getCloudflareContext();
const baseUrl = context?.req.url
	? new URL(context.req.url).origin
	: "https://example.com";

export const auth = betterAuth({
	database: drizzleAdapter(kyselyDb, {
		provider: "sqlite",
		schema: authSchema,
	}),
	// database: {
	//     db: kyselyDb,
	//     type: "sqlite",
	// },
	emailAndPassword: { enabled: false },
	baseURL: baseUrl,
	secret: context?.env.BETTER_AUTH_SECRET,
	socialProviders: {
		// github: {
		//     clientId: process.env.GITHUB_CLIENT_ID!,
		//     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		// },
		// discord: {
		//     clientId: process.env.DISCORD_CLIENT_ID!,
		//     clientSecret: process.env.DISCORD_CLIENT_SECRET!,
		// },
	},
	plugins: [
		admin(),
		magicLink({
			async sendMagicLink(data) {
				console.log({
					data,
				});
				// await resend.emails.send({
				//     from,
				//     to: to || data.email,
				//     subject: "Sign in to Better Auth",
				//     html: `
				// 		<p>Click the link below to sign in to Better Auth:</p>
				// 		<a href="${data.url}">Sign in</a>
				// 	`,
				// });
			},
		}),
	],
});
