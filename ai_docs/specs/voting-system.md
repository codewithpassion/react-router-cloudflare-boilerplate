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

## API Endpoints

### Cast Vote
```typescript
POST /api/photos/:photoId/vote
Authorization: Bearer <token>

Response:
{
  "success": true,
  "voteCount": 15,
  "userHasVoted": true
}

Error Responses:
400 - Already voted
403 - Cannot vote on own photo
404 - Photo not found
401 - Authentication required
```

### Get Vote Status
```typescript
GET /api/photos/:photoId/votes
Authorization: Bearer <token> (optional)

Response:
{
  "voteCount": 15,
  "userHasVoted": true, // Only if authenticated
  "canVote": false // Based on auth and ownership
}
```

### Get Photos with Votes
```typescript
GET /api/competitions/:competitionId/photos?categoryId=cat_1&sortBy=votes&order=desc&limit=20&offset=0
Authorization: Bearer <token> (optional)

Response:
{
  "photos": [
    {
      "id": "photo_123",
      "title": "Mountain Wildlife",
      "description": "Beautiful capture...",
      "filePath": "/uploads/comp_123/photo_123.jpg",
      "voteCount": 25,
      "userHasVoted": false,
      "canVote": true,
      "categoryId": "cat_1",
      "categoryName": "Landscape",
      "photographer": {
        "id": "user_456",
        "email": "photographer@example.com"
      },
      "dateTaken": "2024-01-10T15:30:00Z",
      "location": "Rocky Mountains",
      "cameraInfo": "Canon EOS R5",
      "settings": "ISO 800, f/5.6, 1/500s"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### Get User Vote History
```typescript
GET /api/votes/mine?competitionId=comp_123
Authorization: Bearer <token>

Response:
{
  "votes": [
    {
      "id": "vote_123",
      "photoId": "photo_456",
      "photoTitle": "Sunset Wildlife",
      "categoryName": "Landscape",
      "votedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalVotes": 1
}
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

### 2. Voting API Routes

#### File: `api/routes/voting.ts`

```typescript
import { Hono } from 'hono';
import { VotingService } from '../services/voting.service';
import { authMiddleware, optionalAuth } from '../../workers/auth-middleware';

const app = new Hono();
const votingService = new VotingService();

// Cast vote (requires authentication)
app.post('/photos/:photoId/vote', authMiddleware, async (c) => {
  const user = c.get('user');
  const { photoId } = c.req.param();

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await votingService.castVote(user.id, photoId);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      success: true,
      voteCount: result.voteCount,
      userHasVoted: true,
    });
  } catch (error) {
    return c.json({ error: 'Failed to cast vote' }, 500);
  }
});

// Get vote status for a photo (optional authentication)
app.get('/photos/:photoId/votes', optionalAuth, async (c) => {
  const user = c.get('user');
  const { photoId } = c.req.param();

  try {
    const status = await votingService.getUserVoteStatus(user?.id, photoId);
    return c.json(status);
  } catch (error) {
    return c.json({ error: 'Failed to get vote status' }, 500);
  }
});

// Get photos with votes (optional authentication for user status)
app.get('/competitions/:competitionId/photos', optionalAuth, async (c) => {
  const user = c.get('user');
  const { competitionId } = c.req.param();
  
  const categoryId = c.req.query('categoryId');
  const sortBy = c.req.query('sortBy') as 'votes' | 'date' | 'title' || 'votes';
  const order = c.req.query('order') as 'asc' | 'desc' || 'desc';
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await votingService.getPhotosWithVotes(
      competitionId,
      { categoryId, sortBy, order, limit, offset },
      user?.id
    );

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get photos' }, 500);
  }
});

// Get user's vote history (requires authentication)
app.get('/votes/mine', authMiddleware, async (c) => {
  const user = c.get('user');
  const competitionId = c.req.query('competitionId');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await votingService.getUserVoteHistory(user.id, competitionId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get vote history' }, 500);
  }
});

// Get top photos (public)
app.get('/competitions/:competitionId/top', async (c) => {
  const { competitionId } = c.req.param();
  const categoryId = c.req.query('categoryId');
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const result = await votingService.getTopPhotos(competitionId, categoryId, limit);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get top photos' }, 500);
  }
});

// Get voting statistics (public)
app.get('/competitions/:competitionId/stats', async (c) => {
  const { competitionId } = c.req.param();

  try {
    const stats = await votingService.getVotingStats(competitionId);
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Failed to get voting stats' }, 500);
  }
});

export default app;
```

### 3. Frontend Voting Components

#### File: `app/components/vote-button.tsx`

```typescript
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '~/hooks/use-auth';

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
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userHasVoted, setUserHasVoted] = useState(initialUserHasVoted);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (!isAuthenticated || !canVote || userHasVoted) return;

    setLoading(true);
    
    try {
      const response = await fetch(`/api/photos/${photoId}/vote`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setVoteCount(result.voteCount);
        setUserHasVoted(true);
        onVoteChange?.(result.voteCount, true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to vote');
      }
    } catch (error) {
      alert('Failed to vote');
    } finally {
      setLoading(false);
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
      disabled={loading || !canVote || userHasVoted}
      className="flex items-center gap-2"
    >
      <Heart 
        className={`w-5 h-5 ${userHasVoted ? 'fill-current' : ''}`} 
      />
      <span>{voteCount}</span>
      {loading && <span>...</span>}
      {userHasVoted && <span className="text-sm">Voted</span>}
      {!canVote && !userHasVoted && isAuthenticated && (
        <span className="text-sm">Can't vote</span>
      )}
    </Button>
  );
}
```

#### File: `app/components/photo-gallery.tsx`

```typescript
import { useState, useEffect } from 'react';
import { VoteButton } from './vote-button';
import { Button } from '~/components/ui/button';

interface Photo {
  id: string;
  title: string;
  description: string;
  filePath: string;
  voteCount: number;
  userHasVoted: boolean;
  canVote: boolean;
  categoryName: string;
  photographer: {
    id: string;
    email: string;
  };
  dateTaken: string;
  location: string;
  cameraInfo?: string;
  settings?: string;
}

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPhotos = async (reset = false) => {
    setLoading(true);
    
    const offset = reset ? 0 : (page - 1) * 20;
    const params = new URLSearchParams({
      sortBy,
      order,
      limit: '20',
      offset: offset.toString(),
    });
    
    if (categoryId) params.append('categoryId', categoryId);

    try {
      const response = await fetch(
        `/api/competitions/${competitionId}/photos?${params}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const result = await response.json();
        
        if (reset) {
          setPhotos(result.photos);
          setPage(1);
        } else {
          setPhotos(prev => [...prev, ...result.photos]);
        }
        
        setHasMore(result.photos.length === 20);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos(true);
  }, [competitionId, categoryId, sortBy, order]);

  const handleVoteChange = (photoId: string, newVoteCount: number, userHasVoted: boolean) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, voteCount: newVoteCount, userHasVoted, canVote: false }
        : photo
    ));
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadPhotos();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="border rounded-lg overflow-hidden bg-white shadow">
            <img
              src={photo.filePath}
              alt={photo.title}
              className="w-full h-64 object-cover"
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

      {loading && <div className="text-center">Loading...</div>}
      
      {hasMore && !loading && (
        <div className="text-center">
          <Button onClick={loadMore}>Load More</Button>
        </div>
      )}
      
      {!hasMore && photos.length > 0 && (
        <div className="text-center text-gray-500">No more photos</div>
      )}
      
      {!loading && photos.length === 0 && (
        <div className="text-center text-gray-500">No photos found</div>
      )}
    </div>
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