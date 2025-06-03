import BetterSqlite3 from "better-sqlite3";
import { drizzle as drizzleLocal } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// For development - using local SQLite
function createLocalDb() {
	const sqlite = new BetterSqlite3("./.wrangler/state/v3/d1/DB.sqlite3");
	return drizzleLocal(sqlite, { schema });
}

// For production - using Cloudflare D1
function createProductionDb(database: D1Database) {
	return drizzle(database, { schema });
}

// This will be initialized per request with the appropriate database
export function createDb(database?: D1Database) {
	if (database) {
		return createProductionDb(database);
	}

	// Fallback to local database for development
	return createLocalDb();
}

// Type for the database instance
export type DatabaseType = ReturnType<typeof createDb>;
