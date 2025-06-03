import type { GetPlatformProxyOptions } from "wrangler";
import type { AuthCloudflareBindings } from "./types";

const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");

export type CloudflareContext<
	TEnv = AuthCloudflareBindings,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
	Context = ExecutionContext,
> = {
	/**
	 * the worker's [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
	 */
	env: TEnv;
	/**
	 * the request's [cf properties](https://developers.cloudflare.com/workers/runtime-apis/request/#the-cf-property-requestinitcfproperties)
	 */
	cf: CfProperties | undefined;
	/**
	 * the current [execution context](https://developers.cloudflare.com/workers/runtime-apis/context)
	 */
	ctx: Context;

	req: Request;
};

/**
 * Adds the cloudflare context to the global scope of the current node.js process, enabling
 * future calls to `getCloudflareContext` to retrieve and return such context
 *
 * @param cloudflareContext the cloudflare context to add to the node.sj global scope
 */
export function addCloudflareContextToNodejsGlobal<
	TEnv = AuthCloudflareBindings,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
	Context = ExecutionContext,
>(cloudflareContext: CloudflareContext<TEnv, CfProperties, Context>) {
	const global = globalThis as InternalGlobalThis<TEnv, CfProperties, Context>;
	global[cloudflareContextSymbol] = cloudflareContext;
}

export function getCloudflareContext<
	TEnv = AuthCloudflareBindings,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
	Context = ExecutionContext,
>() {
	const global = globalThis as InternalGlobalThis<TEnv, CfProperties, Context>;
	return global[cloudflareContextSymbol];
}

/**
 * `globalThis` override for internal usage
 */
type InternalGlobalThis<
	TEnv = AuthCloudflareBindings,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
	Context = ExecutionContext,
> = typeof globalThis & {
	[cloudflareContextSymbol]:
		| CloudflareContext<TEnv, CfProperties, Context>
		| undefined;
	__NEXT_DATA__: Record<string, unknown>;
};

/**
 * Gets a cloudflare context object from wrangler
 *
 * @returns the cloudflare context ready for use
 */
export async function getCloudflareContextFromWrangler<
	TEnv = AuthCloudflareBindings,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
	Context = ExecutionContext,
>(
	options?: GetPlatformProxyOptions,
): Promise<CloudflareContext<TEnv, CfProperties, Context>> {
	// Note: we never want wrangler to be bundled in the Next.js app, that's why the import below looks like it does
	const { getPlatformProxy } = await import(
		/* webpackIgnore: true */ /* @vite-ignore  */ `${"__wrangler".replaceAll("_", "")}`
	);

	// This allows the selection of a wrangler environment while running in next dev mode
	//   const environment = options?.environment ?? process.env.NEXT_DEV_WRANGLER_ENV;

	const { env, cf, ctx } = await getPlatformProxy({
		...options,
		// environment,
	});
	return {
		env,
		cf: cf as unknown as CfProperties,
		ctx: ctx as Context,
		req: new Request("https://example.com"),
	};
}
