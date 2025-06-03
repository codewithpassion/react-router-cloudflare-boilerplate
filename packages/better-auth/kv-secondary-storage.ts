import type { SecondaryStorage } from "better-auth";

export function getCloudflareSecondaryStorage(env: {
	KV: KVNamespace;
}): SecondaryStorage {
	return {
		get: async (key: string) => {
			const value = await env.KV.get(key);
			if (value === null) {
				return null;
			}
			return JSON.parse(value);
		},
		// biome-ignore lint/suspicious/noExplicitAny: interface requires any type
		set: async (key: string, value: any) => {
			await env.KV.put(key, JSON.stringify(value));
		},
		delete: async (key: string) => {
			await env.KV.delete(key);
		},
	};
}
