import { TRPCError, initTRPC } from "@trpc/server";
import type { AppType } from "../../workers/types";
import { createDb } from "../database/db";

interface CreateContextOptions {
	env: CloudflareBindings;
	executionCtx: ExecutionContext;
	request: Request;
	user?: {
		id: string;
		email: string;
		role?: string;
	};
}

export async function createTRPCContext(opts: CreateContextOptions) {
	const db = createDb(opts.env.DB);

	return {
		db,
		env: opts.env,
		executionCtx: opts.executionCtx,
		request: opts.request,
		user: opts.user,
	};
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		});
	}
	return next({
		ctx: {
			...ctx,
			user: ctx.user,
		},
	});
});

// Admin procedure that requires admin role
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.user.role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be an admin to access this resource",
		});
	}
	return next({
		ctx,
	});
});

export const createTRPCRouter = t.router;
