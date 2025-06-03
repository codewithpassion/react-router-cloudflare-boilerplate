# Public Gallery & Browsing Specification

## Overview
Public-facing photo gallery for browsing competition entries with filtering, sorting, and responsive design for all device types.

## Features

### 1. Gallery Views
- Grid layout with masonry option
- Category-based filtering
- Competition timeline view
- Featured/top photos section

### 2. Photo Browsing
- Lightbox for full-size viewing
- Photo metadata display
- Photographer information
- Vote counts and rankings

### 3. Search & Filtering
- Search by title/description
- Filter by category
- Filter by date range
- Sort by votes, date, or title

### 4. Mobile Optimization
- Touch-friendly interface
- Swipe navigation
- Responsive image loading
- Optimized for 3G networks

## User Experience

### Navigation Flow
```
Home → Competition Gallery → Category View → Photo Detail → Lightbox
```

### Responsive Breakpoints
- **Mobile**: < 768px (1 column)
- **Tablet**: 768px - 1024px (2-3 columns)
- **Desktop**: > 1024px (3-4 columns)

## API Endpoints

### Gallery Photos
```typescript
GET /api/gallery/competitions/:competitionId/photos
Query Parameters:
- categoryId?: string
- search?: string
- sortBy?: 'votes' | 'date' | 'title'
- order?: 'asc' | 'desc'
- limit?: number
- offset?: number

Response:
{
  "photos": [
    {
      "id": "photo_123",
      "title": "Mountain Wildlife",
      "description": "Beautiful capture of wildlife...",
      "filePath": "/uploads/comp_123/photo_123.jpg",
      "thumbnailPath": "/uploads/comp_123/thumb_photo_123.jpg",
      "voteCount": 25,
      "categoryId": "cat_1",
      "categoryName": "Landscape",
      "photographer": {
        "id": "user_456",
        "displayName": "Nature Lover" // Or email if no display name
      },
      "dateTaken": "2024-01-10T15:30:00Z",
      "location": "Rocky Mountains",
      "cameraInfo": "Canon EOS R5",
      "settings": "ISO 800, f/5.6, 1/500s",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

### Competition Overview
```typescript
GET /api/gallery/competitions/:competitionId
Response:
{
  "competition": {
    "id": "comp_123",
    "title": "Wildlife Photography 2024",
    "description": "Annual wildlife photography competition...",
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "totalPhotos": 250,
    "totalVotes": 1500
  },
  "categories": [
    {
      "id": "cat_1",
      "name": "Urban",
      "description": "Urban wildlife photography",
      "photoCount": 120,
      "topPhoto": {
        "id": "photo_789",
        "title": "City Fox",
        "thumbnailPath": "/uploads/comp_123/thumb_photo_789.jpg",
        "voteCount": 45
      }
    }
  ],
  "topPhotos": [
    {
      "id": "photo_456",
      "title": "Eagle in Flight",
      "thumbnailPath": "/uploads/comp_123/thumb_photo_456.jpg",
      "voteCount": 67,
      "categoryName": "Wildlife"
    }
  ]
}
```

### Photo Detail
```typescript
GET /api/gallery/photos/:photoId
Response:
{
  "photo": {
    "id": "photo_123",
    "title": "Mountain Wildlife",
    "description": "A stunning capture of a mountain goat...",
    "filePath": "/uploads/comp_123/photo_123.jpg",
    "voteCount": 25,
    "rank": 5,
    "categoryId": "cat_1",
    "categoryName": "Landscape",
    "competitionId": "comp_123",
    "competitionTitle": "Wildlife Photography 2024",
    "photographer": {
      "id": "user_456",
      "displayName": "Nature Photographer",
      "totalPhotos": 8,
      "totalVotes": 156
    },
    "metadata": {
      "dateTaken": "2024-01-10T15:30:00Z",
      "location": "Rocky Mountains National Park",
      "cameraInfo": "Canon EOS R5 + 100-400mm f/4.5-5.6L",
      "settings": "ISO 800, f/5.6, 1/500s, 300mm"
    },
    "submittedAt": "2024-01-15T10:00:00Z"
  },
  "related": [
    {
      "id": "photo_789",
      "title": "Alpine Lake",
      "thumbnailPath": "/uploads/comp_123/thumb_photo_789.jpg",
      "voteCount": 18,
      "categoryName": "Landscape"
    }
  ]
}
```

## Implementation

### 1. Gallery Service

#### File: `api/services/gallery.service.ts`

```typescript
import { db } from '../database/db';
import { 
  photos, 
  competitions, 
  categories, 
  votes, 
  users 
} from '../database/competition-schema';
import { eq, and, desc, asc, sql, like, count } from 'drizzle-orm';

export class GalleryService {
  
  async getCompetitionOverview(competitionId: string) {
    // Get competition details
    const competition = await db
      .select({
        id: competitions.id,
        title: competitions.title,
        description: competitions.description,
        status: competitions.status,
        startDate: competitions.startDate,
        endDate: competitions.endDate,
      })
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .get();

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Get total photo and vote counts
    const photoCount = await db
      .select({ count: count() })
      .from(photos)
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved')
      ))
      .get();

    const voteCount = await db
      .select({ count: count() })
      .from(votes)
      .innerJoin(photos, eq(votes.photoId, photos.id))
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved')
      ))
      .get();

    // Get categories with photo counts and top photos
    const categoriesWithStats = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        photoCount: sql<number>`COUNT(DISTINCT ${photos.id})`,
      })
      .from(categories)
      .leftJoin(photos, and(
        eq(categories.id, photos.categoryId),
        eq(photos.status, 'approved')
      ))
      .where(eq(categories.competitionId, competitionId))
      .groupBy(categories.id, categories.name, categories.description);

    // Get top photo for each category
    const categoriesWithTopPhotos = await Promise.all(
      categoriesWithStats.map(async (category) => {
        const topPhoto = await this.getTopPhotoForCategory(category.id);
        return {
          ...category,
          topPhoto,
        };
      })
    );

    // Get overall top photos
    const topPhotos = await this.getTopPhotos(competitionId, 5);

    return {
      competition: {
        ...competition,
        totalPhotos: photoCount.count,
        totalVotes: voteCount.count,
      },
      categories: categoriesWithTopPhotos,
      topPhotos,
    };
  }

  async getGalleryPhotos(competitionId: string, filters: {
    categoryId?: string;
    search?: string;
    sortBy?: 'votes' | 'date' | 'title';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}) {
    const {
      categoryId,
      search,
      sortBy = 'votes',
      order = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    // Build base query with vote counts
    let query = db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        filePath: photos.filePath,
        categoryId: photos.categoryId,
        categoryName: categories.name,
        photographerId: photos.userId,
        photographerEmail: users.email,
        dateTaken: photos.dateTaken,
        location: photos.location,
        cameraInfo: photos.cameraInfo,
        settings: photos.settings,
        createdAt: photos.createdAt,
        voteCount: sql<number>`COUNT(${votes.id})`.as('voteCount'),
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved'),
        categoryId ? eq(photos.categoryId, categoryId) : undefined,
        search ? like(photos.title, `%${search}%`) : undefined
      ))
      .groupBy(
        photos.id, 
        categories.name, 
        users.email,
        photos.title,
        photos.description,
        photos.filePath,
        photos.categoryId,
        photos.userId,
        photos.dateTaken,
        photos.location,
        photos.cameraInfo,
        photos.settings,
        photos.createdAt
      );

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

    // Get total count for pagination
    const totalQuery = db
      .select({ count: count() })
      .from(photos)
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved'),
        categoryId ? eq(photos.categoryId, categoryId) : undefined,
        search ? like(photos.title, `%${search}%`) : undefined
      ));

    const totalResult = await totalQuery.get();

    // Transform results
    const transformedPhotos = results.map(photo => ({
      ...photo,
      thumbnailPath: this.getThumbnailPath(photo.filePath),
      photographer: {
        id: photo.photographerId,
        displayName: photo.photographerEmail, // Could be enhanced with display names
      },
    }));

    return {
      photos: transformedPhotos,
      total: totalResult.count,
      limit,
      offset,
      hasMore: offset + limit < totalResult.count,
    };
  }

  async getPhotoDetail(photoId: string) {
    // Get photo with all details
    const photoQuery = db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        filePath: photos.filePath,
        categoryId: photos.categoryId,
        categoryName: categories.name,
        competitionId: photos.competitionId,
        competitionTitle: competitions.title,
        photographerId: photos.userId,
        photographerEmail: users.email,
        dateTaken: photos.dateTaken,
        location: photos.location,
        cameraInfo: photos.cameraInfo,
        settings: photos.settings,
        createdAt: photos.createdAt,
        voteCount: sql<number>`COUNT(${votes.id})`.as('voteCount'),
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .innerJoin(competitions, eq(photos.competitionId, competitions.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.id, photoId),
        eq(photos.status, 'approved')
      ))
      .groupBy(
        photos.id,
        categories.name,
        competitions.title,
        users.email,
        photos.title,
        photos.description,
        photos.filePath,
        photos.categoryId,
        photos.competitionId,
        photos.userId,
        photos.dateTaken,
        photos.location,
        photos.cameraInfo,
        photos.settings,
        photos.createdAt
      )
      .get();

    if (!photoQuery) {
      throw new Error('Photo not found');
    }

    // Get photographer statistics
    const photographerStats = await db
      .select({
        totalPhotos: sql<number>`COUNT(DISTINCT ${photos.id})`,
        totalVotes: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.userId, photoQuery.photographerId),
        eq(photos.status, 'approved')
      ))
      .get();

    // Get photo rank in category
    const rankQuery = await db
      .select({
        photoId: photos.id,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.categoryId, photoQuery.categoryId),
        eq(photos.status, 'approved')
      ))
      .groupBy(photos.id)
      .orderBy(desc(sql`COUNT(${votes.id})`));

    const rank = rankQuery.findIndex(p => p.photoId === photoId) + 1;

    // Get related photos (same category, excluding current)
    const related = await this.getRelatedPhotos(photoQuery.categoryId, photoId, 4);

    return {
      photo: {
        ...photoQuery,
        rank,
        photographer: {
          id: photoQuery.photographerId,
          displayName: photoQuery.photographerEmail,
          totalPhotos: photographerStats?.totalPhotos || 0,
          totalVotes: photographerStats?.totalVotes || 0,
        },
        metadata: {
          dateTaken: photoQuery.dateTaken,
          location: photoQuery.location,
          cameraInfo: photoQuery.cameraInfo,
          settings: photoQuery.settings,
        },
        submittedAt: photoQuery.createdAt,
      },
      related,
    };
  }

  private async getTopPhotoForCategory(categoryId: string) {
    const topPhoto = await db
      .select({
        id: photos.id,
        title: photos.title,
        filePath: photos.filePath,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.categoryId, categoryId),
        eq(photos.status, 'approved')
      ))
      .groupBy(photos.id, photos.title, photos.filePath)
      .orderBy(desc(sql`COUNT(${votes.id})`))
      .limit(1)
      .get();

    if (!topPhoto) return null;

    return {
      ...topPhoto,
      thumbnailPath: this.getThumbnailPath(topPhoto.filePath),
    };
  }

  private async getTopPhotos(competitionId: string, limit: number) {
    const topPhotos = await db
      .select({
        id: photos.id,
        title: photos.title,
        filePath: photos.filePath,
        categoryName: categories.name,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.competitionId, competitionId),
        eq(photos.status, 'approved')
      ))
      .groupBy(photos.id, photos.title, photos.filePath, categories.name)
      .orderBy(desc(sql`COUNT(${votes.id})`))
      .limit(limit);

    return topPhotos.map(photo => ({
      ...photo,
      thumbnailPath: this.getThumbnailPath(photo.filePath),
    }));
  }

  private async getRelatedPhotos(categoryId: string, excludePhotoId: string, limit: number) {
    const related = await db
      .select({
        id: photos.id,
        title: photos.title,
        filePath: photos.filePath,
        categoryName: categories.name,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.categoryId, categoryId),
        eq(photos.status, 'approved'),
        sql`${photos.id} != ${excludePhotoId}`
      ))
      .groupBy(photos.id, photos.title, photos.filePath, categories.name)
      .orderBy(desc(sql`COUNT(${votes.id})`))
      .limit(limit);

    return related.map(photo => ({
      ...photo,
      thumbnailPath: this.getThumbnailPath(photo.filePath),
    }));
  }

  private getThumbnailPath(filePath: string): string {
    // Generate thumbnail path
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    const dir = pathParts.join('/');
    return `${dir}/thumb_${fileName}`;
  }
}
```

### 2. Gallery API Routes

#### File: `api/routes/gallery.ts`

```typescript
import { Hono } from 'hono';
import { GalleryService } from '../services/gallery.service';

const app = new Hono();
const galleryService = new GalleryService();

// All gallery routes are public
app.get('/competitions/:competitionId', async (c) => {
  const { competitionId } = c.req.param();

  try {
    const overview = await galleryService.getCompetitionOverview(competitionId);
    return c.json(overview);
  } catch (error) {
    return c.json({ error: 'Competition not found' }, 404);
  }
});

app.get('/competitions/:competitionId/photos', async (c) => {
  const { competitionId } = c.req.param();
  
  const categoryId = c.req.query('categoryId');
  const search = c.req.query('search');
  const sortBy = c.req.query('sortBy') as 'votes' | 'date' | 'title' || 'votes';
  const order = c.req.query('order') as 'asc' | 'desc' || 'desc';
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await galleryService.getGalleryPhotos(competitionId, {
      categoryId,
      search,
      sortBy,
      order,
      limit,
      offset,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get photos' }, 500);
  }
});

app.get('/photos/:photoId', async (c) => {
  const { photoId } = c.req.param();

  try {
    const result = await galleryService.getPhotoDetail(photoId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Photo not found' }, 404);
  }
});

export default app;
```

### 3. Frontend Gallery Components

#### File: `app/components/gallery/photo-grid.tsx`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { PhotoCard } from './photo-card';
import { PhotoLightbox } from './photo-lightbox';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface Photo {
  id: string;
  title: string;
  description: string;
  filePath: string;
  thumbnailPath: string;
  voteCount: number;
  categoryName: string;
  photographer: {
    id: string;
    displayName: string;
  };
  dateTaken: string;
  location: string;
  cameraInfo?: string;
  settings?: string;
}

interface PhotoGridProps {
  competitionId: string;
  categories: Array<{ id: string; name: string }>;
}

export function PhotoGrid({ competitionId, categories }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  // Filters
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'date' | 'title'>('votes');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadPhotos = useCallback(async (reset = false) => {
    setLoading(true);
    
    const offset = reset ? 0 : (page - 1) * limit;
    const params = new URLSearchParams({
      sortBy,
      order,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);

    try {
      const response = await fetch(
        `/api/gallery/competitions/${competitionId}/photos?${params}`
      );
      
      if (response.ok) {
        const result = await response.json();
        
        if (reset) {
          setPhotos(result.photos);
          setPage(1);
        } else {
          setPhotos(prev => [...prev, ...result.photos]);
        }
        
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }, [competitionId, categoryId, search, sortBy, order, page]);

  useEffect(() => {
    loadPhotos(true);
  }, [categoryId, search, sortBy, order]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    loadPhotos();
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPhotos(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <Input
            placeholder="Search photos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">Votes</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>

        <Select value={order} onValueChange={(value: any) => setOrder(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => handlePhotoClick(photo)}
          />
        ))}
      </div>

      {/* Loading/Load More */}
      {loading && <div className="text-center">Loading...</div>}
      
      {hasMore && !loading && (
        <div className="text-center">
          <Button onClick={handleLoadMore}>Load More</Button>
        </div>
      )}
      
      {!hasMore && photos.length > 0 && (
        <div className="text-center text-gray-500">No more photos</div>
      )}
      
      {!loading && photos.length === 0 && (
        <div className="text-center text-gray-500">No photos found</div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}
```

#### File: `app/components/gallery/photo-card.tsx`

```typescript
import { Heart } from 'lucide-react';
import type { Photo } from './photo-grid';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  return (
    <div 
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={photo.thumbnailPath}
          alt={photo.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{photo.title}</h3>
          <p className="text-sm text-gray-600">{photo.categoryName}</p>
        </div>
        
        <p className="text-sm text-gray-700 line-clamp-2">
          {photo.description}
        </p>
        
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>📷 {photo.photographer.displayName}</span>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{photo.voteCount}</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          📍 {photo.location}
        </div>
      </div>
    </div>
  );
}
```

## Performance Optimization

### Image Loading
- Lazy loading for off-screen images
- Progressive JPEG encoding
- WebP format with fallbacks
- Responsive image sizes

### Caching Strategy
- CDN caching for static images
- API response caching (5 minutes)
- Browser caching for thumbnails
- Service worker for offline viewing

### Mobile Optimization
- Touch-friendly interface
- Swipe gestures for navigation
- Optimized for 3G networks
- Reduced data usage options

## SEO & Accessibility

### Search Engine Optimization
- Meta tags for photo pages
- Open Graph tags for social sharing
- Structured data for photos
- Sitemap generation

### Accessibility Features
- Alt text for all images
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Testing Strategy

### Performance Testing
- Image loading speed
- Gallery rendering performance
- Mobile responsiveness
- Network condition simulation

### User Experience Testing
- Cross-browser compatibility
- Touch interface testing
- Accessibility compliance
- Search functionality

### Integration Testing
- API endpoint functionality
- Image optimization pipeline
- Caching behavior
- Error handling