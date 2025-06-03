import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { D1Dialect } from "kysely-d1";
import { getCloudflareContext as getCloudflareContextProd } from "./cloudflare";

async function initDbConnectionDev() {
	return new SqliteDialect({
		database: new Database("./.wrangler/state/v3/d1/DB.sqlite3"),
	});
}

function initDbConnection() {
	const ctx = getCloudflareContextProd();
	if (!ctx?.env.DB) {
		throw new Error("Database instance (ctx.env.DB) is undefined.");
	}
	return new D1Dialect({
		database: ctx.env.DB,
	});
}

export const kyselyDb = new Kysely({
	dialect: getCloudflareContextProd()
		? initDbConnection()
		: await initDbConnectionDev(),
});
