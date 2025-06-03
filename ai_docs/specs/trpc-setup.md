# tRPC Setup & Configuration Specification

## Overview
Configuration and setup for tRPC in the photo competition platform, including server setup, client configuration, authentication middleware, and React Query integration.

## Dependencies

### Server Dependencies
```json
{
  "@trpc/server": "^10.45.0",
  "@trpc/server/adapters/hono": "^10.45.0",
  "zod": "^3.22.4"
}
```

### Client Dependencies
```json
{
  "@trpc/client": "^10.45.0",
  "@trpc/react-query": "^10.45.0",
  "@tanstack/react-query": "^5.17.0"
}
```

## Server Setup

### 1. tRPC Context

#### File: `api/trpc/context.ts`

```typescript
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@portcityai/better-auth';
import type { User } from '@portcityai/better-auth';

export interface TRPCContext {
  user: User | null;
  headers: Headers;
}

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<TRPCContext> {
  const { req } = opts;
  
  // Extract session token from request
  const authHeader = req.headers.get('authorization');
  const sessionToken = authHeader?.replace('Bearer ', '') || 
                      req.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];

  let user: User | null = null;

  if (sessionToken) {
    try {
      const session = await auth.api.getSession({
        headers: { authorization: `Bearer ${sessionToken}` }
      });
      user = session?.user || null;
    } catch (error) {
      console.error('Failed to get session:', error);
    }
  }

  return {
    user,
    headers: req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

### 2. tRPC Instance and Middleware

#### File: `api/trpc/trpc.ts`

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Authentication middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// Role-based middleware
const enforceUserRole = (role: 'user' | 'admin' | 'superadmin') =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const roleHierarchy = { user: 0, admin: 1, superadmin: 2 };
    const userRoleLevel = roleHierarchy[ctx.user.role as keyof typeof roleHierarchy] ?? -1;
    const requiredRoleLevel = roleHierarchy[role];

    if (userRoleLevel < requiredRoleLevel) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next({
      ctx: {
        user: ctx.user,
      },
    });
  });

// Procedure helpers
export const protectedProcedure = publicProcedure.use(enforceUserIsAuthed);
export const adminProcedure = publicProcedure.use(enforceUserRole('admin'));
export const superAdminProcedure = publicProcedure.use(enforceUserRole('superadmin'));
```

### 3. Main App Router

#### File: `api/trpc/routers/_app.ts`

```typescript
import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth';
import { competitionRouter } from './competition';
import { photoRouter } from './photo';
import { votingRouter } from './voting';
import { moderationRouter } from './moderation';
import { dashboardRouter } from './dashboard';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  competition: competitionRouter,
  photo: photoRouter,
  voting: votingRouter,
  moderation: moderationRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
```

### 4. Hono Integration

#### File: `api/trpc/hono-adapter.ts`

```typescript
import { trpcServer } from '@trpc/server/adapters/hono';
import { Hono } from 'hono';
import { appRouter } from './routers/_app';
import { createTRPCContext } from './context';

const app = new Hono();

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  })
);

export default app;
```

### 5. Integration with Main API

#### File: `api/index.ts` (Updated)

```typescript
import { Hono } from 'hono';
import trpcApp from './trpc/hono-adapter';

const app = new Hono();

// Mount tRPC router
app.route('/api', trpcApp);

// Other routes...

export default app;
```

## Client Setup

### 1. tRPC Client Configuration

#### File: `app/utils/trpc.ts`

```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../api/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        // Include auth headers
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('session='))
          ?.split('=')[1];
        
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

### 2. React Query Provider Setup

#### File: `app/providers/trpc-provider.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { trpc, trpcClient } from '~/utils/trpc';

interface TRPCProviderProps {
  children: React.ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on auth errors
              if (error?.data?.code === 'UNAUTHORIZED') return false;
              return failureCount < 3;
            },
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 3. App Root Integration

#### File: `app/root.tsx` (Updated)

```typescript
import { Outlet } from 'react-router';
import { TRPCProvider } from './providers/trpc-provider';
import { AuthProvider } from './data/login.context';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Other head elements */}
      </head>
      <body>
        <TRPCProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
```

## Common Schemas

### File: `api/trpc/schemas/common.ts`

```typescript
import { z } from 'zod';

// Common schemas used across routers
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const idSchema = z.string().min(1);

export const userRoleSchema = z.enum(['user', 'admin', 'superadmin']);

export const photoStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const reportReasonSchema = z.enum(['inappropriate', 'copyright', 'spam', 'other']);

export const reportStatusSchema = z.enum(['pending', 'reviewed', 'resolved', 'dismissed']);

export const competitionStatusSchema = z.enum(['draft', 'active', 'ended']);

// File upload schema for client validation
export const fileUploadSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024), // 10MB
  type: z.enum(['image/jpeg', 'image/png']),
});

// Date helpers
export const dateStringSchema = z.string().datetime();
export const dateSchema = z.date().or(z.string().datetime().transform(s => new Date(s)));
```

## Error Handling

### Custom Error Types

#### File: `api/trpc/errors.ts`

```typescript
import { TRPCError } from '@trpc/server';

export class PhotoNotFoundError extends TRPCError {
  constructor() {
    super({
      code: 'NOT_FOUND',
      message: 'Photo not found',
    });
  }
}

export class CompetitionNotFoundError extends TRPCError {
  constructor() {
    super({
      code: 'NOT_FOUND',
      message: 'Competition not found',
    });
  }
}

export class SubmissionLimitExceededError extends TRPCError {
  constructor(limit: number) {
    super({
      code: 'BAD_REQUEST',
      message: `Maximum ${limit} photos allowed per category`,
    });
  }
}

export class AlreadyVotedError extends TRPCError {
  constructor() {
    super({
      code: 'BAD_REQUEST',
      message: 'You have already voted on this photo',
    });
  }
}

export class CannotVoteOwnPhotoError extends TRPCError {
  constructor() {
    super({
      code: 'BAD_REQUEST',
      message: 'Cannot vote on your own photo',
    });
  }
}
```

## Client Usage Examples

### 1. Basic Query Usage

```typescript
import { trpc } from '~/utils/trpc';

function CompetitionList() {
  const { data: competitions, isLoading, error } = trpc.competition.list.useQuery({
    status: 'active',
    limit: 10,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {competitions?.competitions.map(comp => (
        <div key={comp.id}>{comp.title}</div>
      ))}
    </div>
  );
}
```

### 2. Mutation Usage

```typescript
import { trpc } from '~/utils/trpc';

function VoteButton({ photoId }: { photoId: string }) {
  const utils = trpc.useUtils();
  
  const voteMutation = trpc.voting.castVote.useMutation({
    onSuccess: () => {
      // Invalidate and refetch photos
      utils.voting.getPhotosWithVotes.invalidate();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  return (
    <button 
      onClick={() => voteMutation.mutate({ photoId })}
      disabled={voteMutation.isLoading}
    >
      {voteMutation.isLoading ? 'Voting...' : 'Vote'}
    </button>
  );
}
```

### 3. Optimistic Updates

```typescript
import { trpc } from '~/utils/trpc';

function OptimisticVote({ photoId }: { photoId: string }) {
  const utils = trpc.useUtils();
  
  const voteMutation = trpc.voting.castVote.useMutation({
    onMutate: async ({ photoId }) => {
      // Cancel outgoing refetches
      await utils.voting.getPhotosWithVotes.cancel();
      
      // Snapshot previous value
      const previousPhotos = utils.voting.getPhotosWithVotes.getData();
      
      // Optimistically update
      utils.voting.getPhotosWithVotes.setData(
        { competitionId: 'current' },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            photos: old.photos.map(photo => 
              photo.id === photoId 
                ? { ...photo, voteCount: photo.voteCount + 1, userHasVoted: true }
                : photo
            )
          };
        }
      );
      
      return { previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPhotos) {
        utils.voting.getPhotosWithVotes.setData(
          { competitionId: 'current' },
          context.previousPhotos
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      utils.voting.getPhotosWithVotes.invalidate();
    },
  });

  return (
    <button onClick={() => voteMutation.mutate({ photoId })}>
      Vote
    </button>
  );
}
```

## Type Safety

### Generated Types

With tRPC, you get full type safety from server to client:

```typescript
// Types are automatically inferred
const { data } = trpc.competition.getById.useQuery({ id: 'comp_123' });
// data is typed as Competition | undefined

// Mutations are also fully typed
const createMutation = trpc.competition.create.useMutation();
// The input is typed according to the Zod schema
createMutation.mutate({
  title: "New Competition",
  description: "Description here",
  // TypeScript will error if required fields are missing
});
```

### Custom Hooks

```typescript
// Custom hook with proper typing
export function useActiveCompetition() {
  return trpc.competition.getActive.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
}

// Hook with parameters
export function useCompetitionPhotos(competitionId: string, categoryId?: string) {
  return trpc.voting.getPhotosWithVotes.useQuery(
    { competitionId, categoryId },
    { enabled: !!competitionId }
  );
}
```

## Development Tools

### 1. React Query Devtools

Already included in the TRPCProvider setup for development debugging.

### 2. tRPC Panel (Optional)

For API exploration during development:

```typescript
// In development mode only
if (process.env.NODE_ENV === 'development') {
  import('@trpc/panel').then(({ panel }) => {
    app.use('/panel', panel(appRouter));
  });
}
```

## Testing

### 1. Server Testing

```typescript
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '~/api/trpc/routers/_app';

const createCaller = createCallerFactory(appRouter);

describe('Competition Router', () => {
  it('should list competitions', async () => {
    const caller = createCaller({
      user: mockUser,
      headers: new Headers(),
    });

    const result = await caller.competition.list({
      status: 'active',
      limit: 10,
    });

    expect(result.competitions).toBeDefined();
  });
});
```

### 2. Client Testing with MSW

```typescript
import { trpc } from '~/utils/trpc';
import { renderHook } from '@testing-library/react';
import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';

const trpcMsw = createTRPCMsw<AppRouter>();
const server = setupServer();

describe('tRPC Hooks', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should fetch competitions', async () => {
    server.use(
      trpcMsw.competition.list.query(() => {
        return { competitions: [], total: 0 };
      })
    );

    const { result } = renderHook(() => 
      trpc.competition.list.useQuery({ status: 'active' })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## Performance Considerations

### 1. Batching

tRPC automatically batches requests when using `httpBatchLink`.

### 2. Caching Strategy

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes for most data
      cacheTime: 10 * 60 * 1000, // 10 minutes cache
    },
  },
});

// Specific cache times for different data types
trpc.competition.list.useQuery(params, {
  staleTime: 10 * 60 * 1000, // Competitions change less frequently
});

trpc.voting.getPhotosWithVotes.useQuery(params, {
  staleTime: 30 * 1000, // Vote counts change more frequently
});
```

### 3. Prefetching

```typescript
// Prefetch data for better UX
const utils = trpc.useUtils();

const prefetchCompetition = async (id: string) => {
  await utils.competition.getById.prefetch({ id });
};
```

This setup provides a complete tRPC configuration that supports:
- Type-safe API calls
- Authentication middleware
- Role-based access control
- Zod validation
- React Query integration
- Error handling
- Development tools
- Testing support
- Performance optimizations