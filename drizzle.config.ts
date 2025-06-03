import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./migrations",
	schema: [
		"./api/database/schema.ts",
		"./packages/better-auth/db/auth-schema-admin.ts",
	],
	dialect: "sqlite",
	driver: "d1-http",
});
