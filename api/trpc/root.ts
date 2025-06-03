import { moderationRouter } from "./routers/moderation";
import { photoRouter } from "./routers/photo";
import { votingRouter } from "./routers/voting";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
	photo: photoRouter,
	voting: votingRouter,
	moderation: moderationRouter,
});

export type AppRouter = typeof appRouter;
