# Voting System Specification

## Overview
User voting system for photo competitions allowing authenticated users to vote on approved photos with real-time vote counting and display.

## Features

### 1. Voting Mechanics
- One vote per user per photo
- Unlimited photos can be voted on by each user
- Only authenticated users can vote
- Real-time vote count updates
- Vote history tracking

### 2. Vote Display
- Public vote counts on photos
- Sorting by vote count
- Vote count aggregation for rankings
- Category-wise vote statistics

### 3. Voting Rules
- Can only vote on approved photos
- Cannot vote on own photos
- Votes are anonymous (not publicly attributed)
- Vote changes are not allowed (no un-voting)

## Data Models

### Vote Entity
```typescript
interface Vote {
  id: string;
  userId: string;
  photoId: string;
  createdAt: Date;
}
```

### Photo with Vote Count
```typescript
interface PhotoWithVotes {
  id: string;
  title: string;
  description: string;
  filePath: string;
  voteCount: number;
  userHasVoted: boolean; // For authenticated users
  categoryId: string;
  categoryName: string;
  photographer: {
    id: string;
    email: string;
  };
}
```

## tRPC Procedures

### Voting Router

#### File: `api/trpc/routers/voting.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { VotingService } from '../../services/voting.service';
import { 
  idSchema, 
  paginationSchema 
} from '../schemas/common';
import { 
  AlreadyVotedError, 
  CannotVoteOwnPhotoError, 
  PhotoNotFoundError 
} from '../errors';

const getPhotosInputSchema = paginationSchema.extend({
  competitionId: idSchema,
  categoryId: idSchema.optional(),
  sortBy: z.enum(['votes', 'date', 'title']).default('votes'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const getUserVoteHistorySchema = z.object({
  competitionId: idSchema.optional(),
});

const getTopPhotosSchema = z.object({
  competitionId: idSchema,
  categoryId: idSchema.optional(),
  limit: z.number().min(1).max(50).default(10),
});

const votingService = new VotingService();

export const votingRouter = createTRPCRouter({
  // Cast a vote (requires authentication)
  castVote: protectedProcedure
    .input(z.object({ photoId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await votingService.castVote(ctx.user.id, input.photoId);
      
      if (!result.success) {
        if (result.error?.includes('already voted')) {
          throw new AlreadyVotedError();
        }
        if (result.error?.includes('own photo')) {
          throw new CannotVoteOwnPhotoError();
        }
        if (result.error?.includes('not found')) {
          throw new PhotoNotFoundError();
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to cast vote',
        });
      }

      return {
        success: true,
        voteCount: result.voteCount,
        userHasVoted: true,
      };
    }),

  // Get vote status for a photo (public with optional auth)
  getVoteStatus: publicProcedure
    .input(z.object({ photoId: idSchema }))
    .query(async ({ ctx, input }) => {
      return await votingService.getUserVoteStatus(ctx.user?.id || null, input.photoId);
    }),

  // Get photos with votes (public with optional auth for user status)
  getPhotosWithVotes: publicProcedure
    .input(getPhotosInputSchema)
    .query(async ({ ctx, input }) => {
      const { competitionId, categoryId, sortBy, order, limit, offset } = input;
      
      return await votingService.getPhotosWithVotes(
        competitionId,
        { categoryId, sortBy, order, limit, offset },
        ctx.user?.id
      );
    }),

  // Get user's vote history (requires authentication)
  getUserVoteHistory: protectedProcedure
    .input(getUserVoteHistorySchema)
    .query(async ({ ctx, input }) => {
      return await votingService.getUserVoteHistory(ctx.user.id, input.competitionId);
    }),

  // Get top photos (public)
  getTopPhotos: publicProcedure
    .input(getTopPhotosSchema)
    .query(async ({ input }) => {
      const { competitionId, categoryId, limit } = input;
      return await votingService.getTopPhotos(competitionId, categoryId, limit);
    }),

  // Get voting statistics (public)
  getVotingStats: publicProcedure
    .input(z.object({ competitionId: idSchema }))
    .query(async ({ input }) => {
      return await votingService.getVotingStats(input.competitionId);
    }),
});
```

## Implementation

### 1. Voting Service

#### File: `api/services/voting.service.ts`

```typescript
import { db } from '../database/db';
import { votes, photos, categories, users } from '../database/competition-schema';
import { eq, and, count, desc, asc, sql } from 'drizzle-orm';
import { generateId } from '../utils/id';

export class VotingService {
  
  async castVote(userId: string, photoId: string): Promise<{
    success: boolean;
    voteCount: number;
    error?: string;
  }> {
    // Check if photo exists and is approved
    const photo = await db
      .select({
        id: photos.id,
        userId: photos.userId,
        status: photos.status,
      })
      .from(photos)
      .where(eq(photos.id, photoId))
      .get();

    if (!photo) {
      return { success: false, voteCount: 0, error: 'Photo not found' };
    }

    if (photo.status !== 'approved') {
      return { success: false, voteCount: 0, error: 'Can only vote on approved photos' };
    }

    // Check if user is trying to vote on their own photo
    if (photo.userId === userId) {
      return { success: false, voteCount: 0, error: 'Cannot vote on your own photo' };
    }

    // Check if user has already voted
    const existingVote = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.userId, userId),
        eq(votes.photoId, photoId)
      ))
      .get();

    if (existingVote) {
      return { success: false, voteCount: 0, error: 'Already voted on this photo' };
    }

    // Cast vote
    await db.insert(votes).values({
      id: generateId('vote'),
      userId,
      photoId,
    });

    // Get updated vote count
    const voteCount = await this.getPhotoVoteCount(photoId);

    return { success: true, voteCount };
  }

  async getPhotoVoteCount(photoId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.photoId, photoId))
      .get();

    return result.count;
  }

  async getUserVoteStatus(userId: string | null, photoId: string): Promise<{
    voteCount: number;
    userHasVoted: boolean;
    canVote: boolean;
  }> {
    const voteCount = await this.getPhotoVoteCount(photoId);
    
    if (!userId) {
      return {
        voteCount,
        userHasVoted: false,
        canVote: false,
      };
    }

    // Check if user has voted
    const userVote = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.userId, userId),
        eq(votes.photoId, photoId)
      ))
      .get();

    // Check if user owns the photo
    const photo = await db
      .select({ userId: photos.userId, status: photos.status })
      .from(photos)
      .where(eq(photos.id, photoId))
      .get();

    const canVote = photo && 
                   photo.status === 'approved' && 
                   photo.userId !== userId && 
                   !userVote;

    return {
      voteCount,
      userHasVoted: !!userVote,
      canVote: !!canVote,
    };
  }

  async getPhotosWithVotes(
    competitionId: string,
    filters: {
      categoryId?: string;
      sortBy?: 'votes' | 'date' | 'title';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {},
    userId?: string
  ) {
    const {
      categoryId,
      sortBy = 'votes',
      order = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    // Build the base query with vote counts
    let query = db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        filePath: photos.filePath,
        dateTaken: photos.dateTaken,
        location: photos.location,
        cameraInfo: photos.cameraInfo,
        settings: photos.settings,
        categoryId: photos.categoryId,
        categoryName: categories.name,
        photographerId: photos.userId,
        photographerEmail: users.email,
        voteCount: sql<number>`COUNT(${votes.id})`.as('voteCount'),
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved'),
        categoryId ? eq(photos.categoryId, categoryId) : undefined
      ))
      .groupBy(photos.id, categories.name, users.email);

    // Apply sorting
    switch (sortBy) {
      case 'votes':
        query = order === 'desc' 
          ? query.orderBy(desc(sql`COUNT(${votes.id})`), desc(photos.createdAt))
          : query.orderBy(asc(sql`COUNT(${votes.id})`), asc(photos.createdAt));
        break;
      case 'date':
        query = order === 'desc'
          ? query.orderBy(desc(photos.createdAt))
          : query.orderBy(asc(photos.createdAt));
        break;
      case 'title':
        query = order === 'desc'
          ? query.orderBy(desc(photos.title))
          : query.orderBy(asc(photos.title));
        break;
    }

    const results = await query.limit(limit).offset(offset);

    // If user is authenticated, get their vote status for each photo
    const photosWithUserStatus = await Promise.all(
      results.map(async (photo) => {
        let userHasVoted = false;
        let canVote = false;

        if (userId) {
          const userVote = await db
            .select()
            .from(votes)
            .where(and(
              eq(votes.userId, userId),
              eq(votes.photoId, photo.id)
            ))
            .get();

          userHasVoted = !!userVote;
          canVote = photo.photographerId !== userId && !userHasVoted;
        }

        return {
          ...photo,
          userHasVoted,
          canVote,
          photographer: {
            id: photo.photographerId,
            email: photo.photographerEmail,
          },
        };
      })
    );

    return {
      photos: photosWithUserStatus,
      total: results.length,
      limit,
      offset,
    };
  }

  async getUserVoteHistory(userId: string, competitionId?: string) {
    let query = db
      .select({
        id: votes.id,
        photoId: votes.photoId,
        photoTitle: photos.title,
        categoryName: categories.name,
        votedAt: votes.createdAt,
      })
      .from(votes)
      .innerJoin(photos, eq(votes.photoId, photos.id))
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .where(eq(votes.userId, userId));

    if (competitionId) {
      query = query.where(and(
        eq(votes.userId, userId),
        eq(photos.competitionId, competitionId)
      ));
    }

    const results = await query.orderBy(desc(votes.createdAt));

    return {
      votes: results,
      totalVotes: results.length,
    };
  }

  async getTopPhotos(competitionId: string, categoryId?: string, limit = 10) {
    return this.getPhotosWithVotes(competitionId, {
      categoryId,
      sortBy: 'votes',
      order: 'desc',
      limit,
    });
  }

  async getVotingStats(competitionId: string) {
    // Get total votes in competition
    const totalVotes = await db
      .select({ count: count() })
      .from(votes)
      .innerJoin(photos, eq(votes.photoId, photos.id))
      .where(eq(photos.competitionId, competitionId))
      .get();

    // Get votes per category
    const categoryStats = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        voteCount: sql<number>`COUNT(${votes.id})`,
        photoCount: sql<number>`COUNT(DISTINCT ${photos.id})`,
      })
      .from(categories)
      .leftJoin(photos, and(
        eq(categories.id, photos.categoryId),
        eq(photos.status, 'approved')
      ))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(eq(categories.competitionId, competitionId))
      .groupBy(categories.id, categories.name);

    return {
      totalVotes: totalVotes.count,
      categories: categoryStats,
    };
  }
}
```

### 2. Client-Side Usage with tRPC

#### Custom Hooks for Voting

```typescript
// File: app/hooks/use-voting.ts
import { trpc } from '~/utils/trpc';

export function useVoting() {
  return {
    // Cast vote with optimistic updates
    useCastVote: () => trpc.voting.castVote.useMutation(),
    
    // Get vote status for a photo
    useVoteStatus: (photoId: string) =>
      trpc.voting.getVoteStatus.useQuery(
        { photoId },
        { enabled: !!photoId }
      ),

    // Get photos with votes (with optional filtering)
    usePhotosWithVotes: (params: {
      competitionId: string;
      categoryId?: string;
      sortBy?: 'votes' | 'date' | 'title';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }) =>
      trpc.voting.getPhotosWithVotes.useQuery(params, {
        enabled: !!params.competitionId,
        staleTime: 30 * 1000, // Vote counts change frequently
      }),

    // Get user's vote history
    useUserVoteHistory: (competitionId?: string) =>
      trpc.voting.getUserVoteHistory.useQuery(
        { competitionId },
        { staleTime: 5 * 60 * 1000 } // Vote history is relatively stable
      ),

    // Get top photos
    useTopPhotos: (params: {
      competitionId: string;
      categoryId?: string;
      limit?: number;
    }) =>
      trpc.voting.getTopPhotos.useQuery(params, {
        enabled: !!params.competitionId,
        staleTime: 2 * 60 * 1000, // Top photos change moderately
      }),

    // Get voting statistics
    useVotingStats: (competitionId: string) =>
      trpc.voting.getVotingStats.useQuery(
        { competitionId },
        { 
          enabled: !!competitionId,
          staleTime: 5 * 60 * 1000,
        }
      ),
  };
}
```

### 3. Frontend Voting Components with tRPC

#### File: `app/components/vote-button.tsx`

```typescript
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '~/hooks/use-auth';
import { useVoting } from '~/hooks/use-voting';
import { trpc } from '~/utils/trpc';

interface VoteButtonProps {
  photoId: string;
  initialVoteCount: number;
  initialUserHasVoted: boolean;
  canVote: boolean;
  onVoteChange?: (newVoteCount: number, userHasVoted: boolean) => void;
}

export function VoteButton({
  photoId,
  initialVoteCount,
  initialUserHasVoted,
  canVote,
  onVoteChange,
}: VoteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { useCastVote } = useVoting();
  const utils = trpc.useUtils();
  
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userHasVoted, setUserHasVoted] = useState(initialUserHasVoted);

  const voteMutation = useCastVote();

  const handleVote = async () => {
    if (!isAuthenticated || !canVote || userHasVoted) return;
    
    try {
      const result = await voteMutation.mutateAsync({ photoId });
      
      // Update local state
      setVoteCount(result.voteCount);
      setUserHasVoted(true);
      onVoteChange?.(result.voteCount, true);
      
      // Invalidate related queries to refresh data
      utils.voting.getVoteStatus.invalidate({ photoId });
      utils.voting.getPhotosWithVotes.invalidate();
      utils.voting.getTopPhotos.invalidate();
      utils.voting.getVotingStats.invalidate();
      
    } catch (error) {
      // Error handling is built into tRPC
      console.error('Vote error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Heart className="w-5 h-5" />
        <span>{voteCount}</span>
        <span className="text-sm">Login to vote</span>
      </div>
    );
  }

  return (
    <Button
      variant={userHasVoted ? "default" : "outline"}
      size="sm"
      onClick={handleVote}
      disabled={voteMutation.isLoading || !canVote || userHasVoted}
      className="flex items-center gap-2"
    >
      <Heart 
        className={`w-5 h-5 ${userHasVoted ? 'fill-current' : ''}`} 
      />
      <span>{voteCount}</span>
      {voteMutation.isLoading && <span>...</span>}
      {userHasVoted && <span className="text-sm">Voted</span>}
      {!canVote && !userHasVoted && isAuthenticated && (
        <span className="text-sm">Can't vote</span>
      )}
      {voteMutation.error && (
        <span className="text-sm text-red-500">Error</span>
      )}
    </Button>
  );
}
```

#### File: `app/components/photo-gallery.tsx`

```typescript
import { useState } from 'react';
import { VoteButton } from './vote-button';
import { Button } from '~/components/ui/button';
import { useVoting } from '~/hooks/use-voting';

interface PhotoGalleryProps {
  competitionId: string;
  categoryId?: string;
  sortBy?: 'votes' | 'date' | 'title';
  order?: 'asc' | 'desc';
}

export function PhotoGallery({ 
  competitionId, 
  categoryId, 
  sortBy = 'votes', 
  order = 'desc' 
}: PhotoGalleryProps) {
  const [page, setPage] = useState(1);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  
  const { usePhotosWithVotes } = useVoting();

  // Get photos with tRPC
  const { 
    data: photosData, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePhotosWithVotes({
    competitionId,
    categoryId,
    sortBy,
    order,
    limit: 20,
    offset: (page - 1) * 20,
  });

  const photos = photosData?.photos || [];

  const handleVoteChange = (photoId: string, newVoteCount: number, userHasVoted: boolean) => {
    // With tRPC, the data will be automatically invalidated and refetched
    // But we can also update local state for immediate feedback
    setAllPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, voteCount: newVoteCount, userHasVoted, canVote: false }
        : photo
    ));
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading photos: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="border rounded-lg overflow-hidden bg-white shadow">
            <img
              src={photo.filePath}
              alt={photo.title}
              className="w-full h-64 object-cover"
              loading="lazy"
            />
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{photo.title}</h3>
                <p className="text-sm text-gray-600">{photo.categoryName}</p>
              </div>
              
              <p className="text-sm text-gray-700 line-clamp-3">
                {photo.description}
              </p>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>📍 {photo.location}</p>
                <p>📅 {new Date(photo.dateTaken).toLocaleDateString()}</p>
                {photo.cameraInfo && <p>📷 {photo.cameraInfo}</p>}
                {photo.settings && <p>⚙️ {photo.settings}</p>}
                <p>👤 {photo.photographer.email}</p>
              </div>
              
              <VoteButton
                photoId={photo.id}
                initialVoteCount={photo.voteCount}
                initialUserHasVoted={photo.userHasVoted}
                canVote={photo.canVote}
                onVoteChange={(newVoteCount, userHasVoted) => 
                  handleVoteChange(photo.id, newVoteCount, userHasVoted)
                }
              />
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-center">Loading photos...</div>}
      
      {photos.length >= 20 && !isLoading && (
        <div className="text-center">
          <Button onClick={loadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
      
      {photos.length > 0 && photos.length < 20 && (
        <div className="text-center text-gray-500">No more photos</div>
      )}
      
      {!isLoading && photos.length === 0 && (
        <div className="text-center text-gray-500">No photos found</div>
      )}
    </div>
  );
}
```

### 4. Optimistic Updates Example

#### File: `app/components/optimistic-vote-button.tsx`

```typescript
import { Button } from '~/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '~/hooks/use-auth';
import { useVoting } from '~/hooks/use-voting';
import { trpc } from '~/utils/trpc';

interface OptimisticVoteButtonProps {
  photoId: string;
  competitionId: string;
}

export function OptimisticVoteButton({ photoId, competitionId }: OptimisticVoteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { useCastVote, useVoteStatus } = useVoting();
  const utils = trpc.useUtils();
  
  const { data: voteStatus } = useVoteStatus(photoId);

  const voteMutation = useCastVote({
    onMutate: async ({ photoId }) => {
      // Cancel outgoing refetches
      await utils.voting.getPhotosWithVotes.cancel({ competitionId });
      await utils.voting.getVoteStatus.cancel({ photoId });
      
      // Snapshot previous values
      const previousPhotos = utils.voting.getPhotosWithVotes.getData({ competitionId });
      const previousVoteStatus = utils.voting.getVoteStatus.getData({ photoId });
      
      // Optimistically update photos list
      utils.voting.getPhotosWithVotes.setData(
        { competitionId },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            photos: old.photos.map(photo => 
              photo.id === photoId 
                ? { 
                    ...photo, 
                    voteCount: photo.voteCount + 1, 
                    userHasVoted: true,
                    canVote: false
                  }
                : photo
            )
          };
        }
      );
      
      // Optimistically update vote status
      utils.voting.getVoteStatus.setData(
        { photoId },
        (old) => old ? {
          ...old,
          voteCount: old.voteCount + 1,
          userHasVoted: true,
          canVote: false,
        } : undefined
      );
      
      return { previousPhotos, previousVoteStatus };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPhotos) {
        utils.voting.getPhotosWithVotes.setData(
          { competitionId },
          context.previousPhotos
        );
      }
      if (context?.previousVoteStatus) {
        utils.voting.getVoteStatus.setData(
          { photoId },
          context.previousVoteStatus
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      utils.voting.getPhotosWithVotes.invalidate({ competitionId });
      utils.voting.getVoteStatus.invalidate({ photoId });
      utils.voting.getTopPhotos.invalidate({ competitionId });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Heart className="w-5 h-5" />
        <span>{voteStatus?.voteCount || 0}</span>
        <span className="text-sm">Login to vote</span>
      </div>
    );
  }

  if (!voteStatus) {
    return <div>Loading...</div>;
  }

  return (
    <Button
      variant={voteStatus.userHasVoted ? "default" : "outline"}
      size="sm"
      onClick={() => voteMutation.mutate({ photoId })}
      disabled={voteMutation.isLoading || !voteStatus.canVote || voteStatus.userHasVoted}
      className="flex items-center gap-2"
    >
      <Heart 
        className={`w-5 h-5 ${voteStatus.userHasVoted ? 'fill-current' : ''}`} 
      />
      <span>{voteStatus.voteCount}</span>
      {voteMutation.isLoading && <span>...</span>}
      {voteStatus.userHasVoted && <span className="text-sm">Voted</span>}
      {!voteStatus.canVote && !voteStatus.userHasVoted && (
        <span className="text-sm">Can't vote</span>
      )}
    </Button>
  );
}
```

## Performance Optimizations

### Database Optimizations
- Index on `(user_id, photo_id)` for vote uniqueness
- Index on `photo_id` for vote counting
- Aggregate vote counts in queries to avoid N+1 problems

### Client-Side Optimizations
- Optimistic UI updates for voting
- Pagination for large photo sets
- Image lazy loading
- Vote count caching

### Real-time Updates
- WebSocket connections for live vote updates
- Event-driven vote count synchronization
- Debounced vote count refreshes

## Testing Strategy

### Unit Tests
- Vote validation logic
- Duplicate vote prevention
- Vote counting accuracy
- Permission checking

### Integration Tests
- Complete voting flow
- Vote count aggregation
- User vote history
- Sorting and filtering

### E2E Tests
- User voting journey
- Real-time vote updates
- Gallery interaction
- Vote statistics display