import { createWorkersKVSessionStorage } from "@react-router/cloudflare";
import { type AppLoadContext, type Cookie, createCookie } from "react-router";

const sessionStore = (context: AppLoadContext, cookie: Cookie) => {
	const { getSession, commitSession, destroySession } =
		createWorkersKVSessionStorage({
			kv: context.cloudflare.env.SESSIONS,
			cookie: cookie,
		});

	return { getSession, commitSession, destroySession };
};

export { createCookie, sessionStore };
