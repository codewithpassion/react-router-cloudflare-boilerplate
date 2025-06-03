# Winner Declaration Specification

## Overview
System for admins to declare competition winners with 1st, 2nd, and 3rd place selections per category, including public winner display and announcement features.

## Features

### 1. Winner Selection Process
- Category-wise winner selection
- 1st, 2nd, and 3rd place for each category
- Photo ranking by votes as suggestions
- Manual winner override capability
- Bulk winner declaration

### 2. Winner Management
- Edit/change winner selections
- Remove winner declarations
- Winner validation rules
- Competition completion workflow

### 3. Public Winner Display
- Winner announcement page
- Category-wise results
- Photo showcase with placement
- Historical winner archive

### 4. Notifications & Announcements
- Winner notification system
- Public announcement features
- Social media sharing
- Email notifications to participants

## Data Models

### Winner Entity
```typescript
interface Winner {
  id: string;
  photoId: string;
  categoryId: string;
  competitionId: string;
  place: 1 | 2 | 3;
  declaredBy: string;
  declaredAt: Date;
  notes?: string;
}
```

### Winner Display
```typescript
interface WinnerDisplay {
  place: 1 | 2 | 3;
  photo: {
    id: string;
    title: string;
    description: string;
    filePath: string;
    voteCount: number;
    photographer: {
      id: string;
      displayName: string;
    };
  };
  category: {
    id: string;
    name: string;
  };
  declaredAt: Date;
}
```

## API Endpoints

### Winner Management (Admin Only)

#### Declare Winners for Category
```typescript
POST /api/admin/categories/:categoryId/winners
Authorization: Bearer <token>

Request:
{
  "winners": [
    {
      "place": 1,
      "photoId": "photo_123",
      "notes": "Outstanding composition and timing"
    },
    {
      "place": 2,
      "photoId": "photo_456",
      "notes": "Excellent technical execution"
    },
    {
      "place": 3,
      "photoId": "photo_789",
      "notes": "Creative perspective"
    }
  ]
}

Response:
{
  "success": true,
  "winners": [
    {
      "id": "winner_1",
      "place": 1,
      "photoId": "photo_123",
      "categoryId": "cat_1",
      "declaredBy": "admin_456",
      "declaredAt": "2024-01-31T15:00:00Z"
    }
  ]
}
```

#### Get Suggested Winners (by votes)
```typescript
GET /api/admin/categories/:categoryId/suggested-winners
Authorization: Bearer <token>

Response:
{
  "suggestedWinners": [
    {
      "place": 1,
      "photo": {
        "id": "photo_123",
        "title": "Mountain Eagle",
        "filePath": "/uploads/comp_123/photo_123.jpg",
        "voteCount": 89,
        "photographer": {
          "id": "user_456",
          "displayName": "Nature Photographer"
        }
      }
    },
    {
      "place": 2,
      "photo": {
        "id": "photo_456",
        "title": "Urban Fox",
        "filePath": "/uploads/comp_123/photo_456.jpg",
        "voteCount": 76,
        "photographer": {
          "id": "user_789",
          "displayName": "City Wildlife"
        }
      }
    }
  ]
}
```

#### Update Winner
```typescript
PUT /api/admin/winners/:winnerId
Authorization: Bearer <token>

Request:
{
  "photoId": "photo_999",
  "notes": "Updated winner selection"
}

Response:
{
  "id": "winner_1",
  "photoId": "photo_999",
  "place": 1,
  "updatedAt": "2024-01-31T16:00:00Z"
}
```

#### Remove Winner
```typescript
DELETE /api/admin/winners/:winnerId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Winner removed successfully"
}
```

### Public Winner Display

#### Get Competition Winners
```typescript
GET /api/competitions/:competitionId/winners

Response:
{
  "competition": {
    "id": "comp_123",
    "title": "Wildlife Photography 2024",
    "status": "ended",
    "endDate": "2024-12-31T23:59:59Z"
  },
  "categories": [
    {
      "id": "cat_1",
      "name": "Urban Wildlife",
      "winners": [
        {
          "place": 1,
          "photo": {
            "id": "photo_123",
            "title": "City Fox at Dawn",
            "description": "A red fox navigating through urban environment...",
            "filePath": "/uploads/comp_123/photo_123.jpg",
            "voteCount": 89,
            "photographer": {
              "id": "user_456",
              "displayName": "Urban Explorer"
            }
          },
          "declaredAt": "2024-01-31T15:00:00Z",
          "notes": "Outstanding composition and timing"
        }
      ]
    }
  ],
  "totalWinners": 6,
  "declaredAt": "2024-01-31T15:00:00Z"
}
```

#### Get Winners Summary
```typescript
GET /api/competitions/:competitionId/winners/summary

Response:
{
  "competition": {
    "title": "Wildlife Photography 2024",
    "totalCategories": 2,
    "totalWinners": 6
  },
  "topWinners": [
    {
      "place": 1,
      "categoryName": "Urban Wildlife",
      "photo": {
        "id": "photo_123",
        "title": "City Fox at Dawn",
        "filePath": "/uploads/comp_123/photo_123.jpg",
        "photographer": {
          "displayName": "Urban Explorer"
        }
      }
    }
  ]
}
```

## Implementation

### 1. Winner Service

#### File: `api/services/winner.service.ts`

```typescript
import { db } from '../database/db';
import { 
  winners, 
  photos, 
  categories, 
  competitions, 
  votes, 
  users 
} from '../database/competition-schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { generateId } from '../utils/id';

export interface WinnerDeclaration {
  place: 1 | 2 | 3;
  photoId: string;
  notes?: string;
}

export class WinnerService {
  
  async declareWinners(
    categoryId: string,
    winnerDeclarations: WinnerDeclaration[],
    declaredBy: string
  ) {
    // Validate category exists
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .get();

    if (!category) {
      throw new Error('Category not found');
    }

    // Validate all photos exist and are approved
    for (const declaration of winnerDeclarations) {
      const photo = await db
        .select()
        .from(photos)
        .where(and(
          eq(photos.id, declaration.photoId),
          eq(photos.categoryId, categoryId),
          eq(photos.status, 'approved')
        ))
        .get();

      if (!photo) {
        throw new Error(`Photo ${declaration.photoId} not found or not approved`);
      }
    }

    // Check for duplicate places
    const places = winnerDeclarations.map(w => w.place);
    if (new Set(places).size !== places.length) {
      throw new Error('Duplicate places not allowed');
    }

    // Remove existing winners for this category
    await db.delete(winners).where(eq(winners.categoryId, categoryId));

    // Insert new winners
    const newWinners = await Promise.all(
      winnerDeclarations.map(async (declaration) => {
        const [winner] = await db.insert(winners).values({
          id: generateId('winner'),
          photoId: declaration.photoId,
          categoryId,
          competitionId: category.competitionId,
          place: declaration.place,
          declaredBy,
          notes: declaration.notes,
        }).returning();

        return winner;
      })
    );

    return newWinners;
  }

  async getSuggestedWinners(categoryId: string) {
    // Get top 3 photos by vote count
    const topPhotos = await db
      .select({
        id: photos.id,
        title: photos.title,
        filePath: photos.filePath,
        photographerId: photos.userId,
        photographerEmail: users.email,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(photos)
      .innerJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(and(
        eq(photos.categoryId, categoryId),
        eq(photos.status, 'approved')
      ))
      .groupBy(photos.id, photos.title, photos.filePath, photos.userId, users.email)
      .orderBy(desc(sql`COUNT(${votes.id})`))
      .limit(3);

    const suggestedWinners = topPhotos.map((photo, index) => ({
      place: (index + 1) as 1 | 2 | 3,
      photo: {
        ...photo,
        photographer: {
          id: photo.photographerId,
          displayName: photo.photographerEmail,
        },
      },
    }));

    return { suggestedWinners };
  }

  async updateWinner(winnerId: string, updates: {
    photoId?: string;
    notes?: string;
  }) {
    const currentWinner = await db
      .select()
      .from(winners)
      .where(eq(winners.id, winnerId))
      .get();

    if (!currentWinner) {
      throw new Error('Winner not found');
    }

    // If changing photo, validate new photo
    if (updates.photoId && updates.photoId !== currentWinner.photoId) {
      const photo = await db
        .select()
        .from(photos)
        .where(and(
          eq(photos.id, updates.photoId),
          eq(photos.categoryId, currentWinner.categoryId),
          eq(photos.status, 'approved')
        ))
        .get();

      if (!photo) {
        throw new Error('New photo not found or not approved');
      }
    }

    const [updated] = await db
      .update(winners)
      .set(updates)
      .where(eq(winners.id, winnerId))
      .returning();

    return updated;
  }

  async removeWinner(winnerId: string) {
    await db.delete(winners).where(eq(winners.id, winnerId));
    return { success: true };
  }

  async getCompetitionWinners(competitionId: string) {
    // Get competition details
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .get();

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Get all categories with their winners
    const categoriesWithWinners = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        winnerId: winners.id,
        winnerPlace: winners.place,
        winnerNotes: winners.notes,
        winnerDeclaredAt: winners.declaredAt,
        photoId: photos.id,
        photoTitle: photos.title,
        photoDescription: photos.description,
        photoFilePath: photos.filePath,
        photographerId: photos.userId,
        photographerEmail: users.email,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(categories)
      .leftJoin(winners, eq(categories.id, winners.categoryId))
      .leftJoin(photos, eq(winners.photoId, photos.id))
      .leftJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(eq(categories.competitionId, competitionId))
      .groupBy(
        categories.id,
        categories.name,
        winners.id,
        winners.place,
        winners.notes,
        winners.declaredAt,
        photos.id,
        photos.title,
        photos.description,
        photos.filePath,
        photos.userId,
        users.email
      )
      .orderBy(categories.name, winners.place);

    // Group by category
    const categoryMap = new Map();
    
    for (const row of categoriesWithWinners) {
      if (!categoryMap.has(row.categoryId)) {
        categoryMap.set(row.categoryId, {
          id: row.categoryId,
          name: row.categoryName,
          winners: [],
        });
      }

      if (row.winnerId) {
        categoryMap.get(row.categoryId).winners.push({
          place: row.winnerPlace,
          photo: {
            id: row.photoId,
            title: row.photoTitle,
            description: row.photoDescription,
            filePath: row.photoFilePath,
            voteCount: row.voteCount,
            photographer: {
              id: row.photographerId,
              displayName: row.photographerEmail,
            },
          },
          declaredAt: row.winnerDeclaredAt,
          notes: row.winnerNotes,
        });
      }
    }

    const categories = Array.from(categoryMap.values());
    const totalWinners = categories.reduce((sum, cat) => sum + cat.winners.length, 0);
    
    // Get earliest declaration date
    const firstDeclaration = await db
      .select({ declaredAt: winners.declaredAt })
      .from(winners)
      .where(eq(winners.competitionId, competitionId))
      .orderBy(winners.declaredAt)
      .limit(1)
      .get();

    return {
      competition: {
        id: competition.id,
        title: competition.title,
        status: competition.status,
        endDate: competition.endDate,
      },
      categories,
      totalWinners,
      declaredAt: firstDeclaration?.declaredAt,
    };
  }

  async getWinnersSummary(competitionId: string) {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .get();

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Get category count
    const categoryCount = await db
      .select({ count: count() })
      .from(categories)
      .where(eq(categories.competitionId, competitionId))
      .get();

    // Get winner count
    const winnerCount = await db
      .select({ count: count() })
      .from(winners)
      .where(eq(winners.competitionId, competitionId))
      .get();

    // Get first place winners
    const topWinners = await db
      .select({
        categoryName: categories.name,
        photoId: photos.id,
        photoTitle: photos.title,
        photoFilePath: photos.filePath,
        photographerId: photos.userId,
        photographerEmail: users.email,
      })
      .from(winners)
      .innerJoin(categories, eq(winners.categoryId, categories.id))
      .innerJoin(photos, eq(winners.photoId, photos.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .where(and(
        eq(winners.competitionId, competitionId),
        eq(winners.place, 1)
      ))
      .orderBy(categories.name);

    return {
      competition: {
        title: competition.title,
        totalCategories: categoryCount.count,
        totalWinners: winnerCount.count,
      },
      topWinners: topWinners.map(winner => ({
        place: 1 as const,
        categoryName: winner.categoryName,
        photo: {
          id: winner.photoId,
          title: winner.photoTitle,
          filePath: winner.photoFilePath,
          photographer: {
            displayName: winner.photographerEmail,
          },
        },
      })),
    };
  }

  async getCategoryWinners(categoryId: string) {
    const categoryWinners = await db
      .select({
        winnerId: winners.id,
        place: winners.place,
        notes: winners.notes,
        declaredAt: winners.declaredAt,
        photoId: photos.id,
        photoTitle: photos.title,
        photoFilePath: photos.filePath,
        photographerId: photos.userId,
        photographerEmail: users.email,
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(winners)
      .innerJoin(photos, eq(winners.photoId, photos.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(eq(winners.categoryId, categoryId))
      .groupBy(
        winners.id,
        winners.place,
        winners.notes,
        winners.declaredAt,
        photos.id,
        photos.title,
        photos.filePath,
        photos.userId,
        users.email
      )
      .orderBy(winners.place);

    return categoryWinners.map(winner => ({
      id: winner.winnerId,
      place: winner.place,
      notes: winner.notes,
      declaredAt: winner.declaredAt,
      photo: {
        id: winner.photoId,
        title: winner.photoTitle,
        filePath: winner.photoFilePath,
        voteCount: winner.voteCount,
        photographer: {
          id: winner.photographerId,
          displayName: winner.photographerEmail,
        },
      },
    }));
  }
}
```

### 2. Winner API Routes

#### File: `api/routes/winners.ts`

```typescript
import { Hono } from 'hono';
import { WinnerService } from '../services/winner.service';
import { authMiddleware, requireRole } from '../../workers/auth-middleware';

const app = new Hono();
const winnerService = new WinnerService();

// Public routes
app.get('/competitions/:competitionId/winners', async (c) => {
  const { competitionId } = c.req.param();

  try {
    const result = await winnerService.getCompetitionWinners(competitionId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Competition not found' }, 404);
  }
});

app.get('/competitions/:competitionId/winners/summary', async (c) => {
  const { competitionId } = c.req.param();

  try {
    const result = await winnerService.getWinnersSummary(competitionId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Competition not found' }, 404);
  }
});

// Admin routes
app.use('/admin/*', authMiddleware, requireRole('admin'));

app.get('/admin/categories/:categoryId/suggested-winners', async (c) => {
  const { categoryId } = c.req.param();

  try {
    const result = await winnerService.getSuggestedWinners(categoryId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Category not found' }, 404);
  }
});

app.get('/admin/categories/:categoryId/winners', async (c) => {
  const { categoryId } = c.req.param();

  try {
    const result = await winnerService.getCategoryWinners(categoryId);
    return c.json({ winners: result });
  } catch (error) {
    return c.json({ error: 'Failed to get winners' }, 500);
  }
});

app.post('/admin/categories/:categoryId/winners', async (c) => {
  const user = c.get('user');
  const { categoryId } = c.req.param();
  const { winners: winnerDeclarations } = await c.req.json();

  try {
    const result = await winnerService.declareWinners(
      categoryId,
      winnerDeclarations,
      user.id
    );

    return c.json({
      success: true,
      winners: result,
    }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/admin/winners/:winnerId', async (c) => {
  const { winnerId } = c.req.param();
  const updates = await c.req.json();

  try {
    const result = await winnerService.updateWinner(winnerId, updates);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/admin/winners/:winnerId', async (c) => {
  const { winnerId } = c.req.param();

  try {
    const result = await winnerService.removeWinner(winnerId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

export default app;
```

### 3. Frontend Winner Components

#### File: `app/components/admin/winner-declaration.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface SuggestedWinner {
  place: 1 | 2 | 3;
  photo: {
    id: string;
    title: string;
    filePath: string;
    voteCount: number;
    photographer: {
      id: string;
      displayName: string;
    };
  };
}

interface WinnerDeclarationProps {
  categoryId: string;
  categoryName: string;
  onSuccess?: () => void;
}

export function WinnerDeclaration({ 
  categoryId, 
  categoryName, 
  onSuccess 
}: WinnerDeclarationProps) {
  const [suggestedWinners, setSuggestedWinners] = useState<SuggestedWinner[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<{
    [key in 1 | 2 | 3]?: {
      photoId: string;
      notes: string;
    };
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuggestedWinners();
  }, [categoryId]);

  const loadSuggestedWinners = async () => {
    try {
      const response = await fetch(
        `/api/admin/categories/${categoryId}/suggested-winners`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const result = await response.json();
        setSuggestedWinners(result.suggestedWinners);
        
        // Initialize selected winners with suggestions
        const initialSelections = result.suggestedWinners.reduce((acc: any, winner: SuggestedWinner) => {
          acc[winner.place] = {
            photoId: winner.photo.id,
            notes: '',
          };
          return acc;
        }, {});
        
        setSelectedWinners(initialSelections);
      }
    } catch (error) {
      console.error('Failed to load suggested winners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareWinners = async () => {
    const winnerDeclarations = Object.entries(selectedWinners)
      .filter(([_, winner]) => winner?.photoId)
      .map(([place, winner]) => ({
        place: parseInt(place) as 1 | 2 | 3,
        photoId: winner!.photoId,
        notes: winner!.notes,
      }));

    if (winnerDeclarations.length === 0) {
      alert('Please select at least one winner');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch(
        `/api/admin/categories/${categoryId}/winners`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winners: winnerDeclarations }),
          credentials: 'include',
        }
      );

      if (response.ok) {
        alert('Winners declared successfully!');
        onSuccess?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to declare winners');
      }
    } catch (error) {
      alert('Failed to declare winners');
    } finally {
      setSaving(false);
    }
  };

  const updateWinnerNotes = (place: 1 | 2 | 3, notes: string) => {
    setSelectedWinners(prev => ({
      ...prev,
      [place]: prev[place] ? { ...prev[place], notes } : undefined,
    }));
  };

  if (loading) return <div>Loading suggested winners...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Declare Winners - {categoryName}</h2>
        <Button onClick={handleDeclareWinners} disabled={saving}>
          {saving ? 'Declaring...' : 'Declare Winners'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((place) => {
          const suggestedWinner = suggestedWinners.find(w => w.place === place);
          const selectedWinner = selectedWinners[place as 1 | 2 | 3];
          
          return (
            <Card key={place}>
              <CardHeader>
                <CardTitle>
                  {place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'} 
                  {' '}{place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'} Place
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestedWinner && (
                  <>
                    <div>
                      <img
                        src={suggestedWinner.photo.filePath}
                        alt={suggestedWinner.photo.title}
                        className="w-full h-48 object-cover rounded"
                      />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{suggestedWinner.photo.title}</h3>
                      <p className="text-sm text-gray-600">
                        by {suggestedWinner.photo.photographer.displayName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {suggestedWinner.photo.voteCount} votes
                      </p>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Winner Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add notes about this winner..."
                    value={selectedWinner?.notes || ''}
                    onChange={(e) => updateWinnerNotes(place as 1 | 2 | 3, e.target.value)}
                  />
                </div>
                
                {!suggestedWinner && (
                  <div className="text-center text-gray-500 py-8">
                    No photos available for this placement
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Note</h3>
        <p className="text-blue-700 text-sm">
          The suggested winners are based on the current vote counts. You can modify 
          the selections and add notes before declaring the final winners.
        </p>
      </div>
    </div>
  );
}
```

#### File: `app/components/winners/winner-showcase.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface Winner {
  place: 1 | 2 | 3;
  photo: {
    id: string;
    title: string;
    description: string;
    filePath: string;
    voteCount: number;
    photographer: {
      id: string;
      displayName: string;
    };
  };
  declaredAt: string;
  notes?: string;
}

interface Category {
  id: string;
  name: string;
  winners: Winner[];
}

interface WinnerShowcaseProps {
  competitionId: string;
}

export function WinnerShowcase({ competitionId }: WinnerShowcaseProps) {
  const [data, setData] = useState<{
    competition: any;
    categories: Category[];
    totalWinners: number;
    declaredAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWinners();
  }, [competitionId]);

  const loadWinners = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/winners`);
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load winners:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading winners...</div>;
  
  if (!data || data.totalWinners === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <h2 className="text-2xl font-semibold mb-4">Winners Not Yet Announced</h2>
        <p>Check back soon for the competition results!</p>
      </div>
    );
  }

  const getPlaceStyle = (place: number) => {
    switch (place) {
      case 1: return 'border-yellow-400 bg-yellow-50';
      case 2: return 'border-gray-400 bg-gray-50';
      case 3: return 'border-amber-600 bg-amber-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getPlaceIcon = (place: number) => {
    switch (place) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🏆 {data.competition.title} Winners
        </h1>
        <p className="text-gray-600">
          Winners announced on {new Date(data.declaredAt).toLocaleDateString()}
        </p>
      </div>

      {data.categories.map((category) => (
        <div key={category.id} className="space-y-6">
          <h2 className="text-2xl font-semibold text-center border-b pb-2">
            {category.name}
          </h2>
          
          {category.winners.length === 0 ? (
            <div className="text-center text-gray-500">
              No winners declared for this category
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {category.winners
                .sort((a, b) => a.place - b.place)
                .map((winner) => (
                  <Card 
                    key={`${category.id}-${winner.place}`}
                    className={`${getPlaceStyle(winner.place)} border-2`}
                  >
                    <CardHeader className="text-center">
                      <CardTitle className="flex items-center justify-center gap-2">
                        <span className="text-2xl">{getPlaceIcon(winner.place)}</span>
                        {winner.place === 1 ? '1st' : winner.place === 2 ? '2nd' : '3rd'} Place
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <img
                        src={winner.photo.filePath}
                        alt={winner.photo.title}
                        className="w-full h-64 object-cover rounded"
                      />
                      
                      <div>
                        <h3 className="font-semibold text-lg">{winner.photo.title}</h3>
                        <p className="text-sm text-gray-600">
                          by {winner.photo.photographer.displayName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {winner.photo.voteCount} votes
                        </p>
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {winner.photo.description}
                      </p>
                      
                      {winner.notes && (
                        <div className="bg-white bg-opacity-70 rounded p-3">
                          <p className="text-sm font-medium text-gray-800">
                            Judge's Note:
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            {winner.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      ))}

      <div className="text-center text-sm text-gray-500 pt-8 border-t">
        Congratulations to all {data.totalWinners} winners and thank you to all participants!
      </div>
    </div>
  );
}
```

## Business Rules

### Winner Declaration Rules
1. Only admins can declare winners
2. Maximum 3 winners per category (1st, 2nd, 3rd)
3. Photos must be approved to be eligible
4. Each photo can only win one place per category
5. Winners can be updated until competition is archived

### Validation Requirements
- Photo must exist and be approved
- Photo must belong to the specified category
- Place must be 1, 2, or 3
- No duplicate places per category
- Admin must have proper permissions

## Testing Strategy

### Unit Tests
- Winner declaration logic
- Validation rules
- Place assignment uniqueness
- Winner update/removal

### Integration Tests
- Winner API endpoints
- Admin permission validation
- Public winner display
- Database consistency

### E2E Tests
- Complete winner declaration flow
- Public winner showcase
- Winner management operations
- Cross-category winner validation