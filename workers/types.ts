/// <reference path="../worker-configuration.d.ts" />
import type { AuthCloudflareBindings } from "@portcityai/better-auth";
import type { DrizzleD1Database } from "drizzle-orm/d1";

declare global {
	interface CloudflareEnvironment extends CloudflareBindings {}
	interface CloudflareVariables extends DatabaseVariables {
		loginService: AuthCloudflareBindings;
	}
}

export type DatabaseVariables = {
	Database: Database;
};
export type DatabaseClient = DrizzleD1Database<Record<string, never>>;

export type Database = {
	client: DatabaseClient;
	seed: () => Promise<void>;
};

export type AppType = {
	Bindings: CloudflareEnvironment;
	Variables: CloudflareVariables;
};
