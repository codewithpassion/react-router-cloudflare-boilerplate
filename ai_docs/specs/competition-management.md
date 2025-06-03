# Competition Management Specification

## Overview
Competition management system for creating, configuring, and managing photo competitions with categories and submission rules.

## Features

### 1. Competition Lifecycle
- **Draft**: Competition being configured
- **Active**: Open for submissions and voting (only one active at a time)
- **Ended**: Closed, winners can be declared

### 2. Competition Configuration
- Basic information (title, description, dates)
- Category management with submission limits
- Automatic status transitions
- Winner declaration system

## Data Models

### Competition Entity
```typescript
interface Competition {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'ended';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  categories: Category[];
}
```

### Category Entity
```typescript
interface Category {
  id: string;
  name: string;
  competitionId: string;
  maxPhotosPerUser: number;
  description?: string;
  createdAt: Date;
}
```

## API Endpoints

### Competition Management

#### Create Competition
```typescript
POST /api/admin/competitions
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Wildlife Photography 2024",
  "description": "Annual wildlife photography competition...",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "categories": [
    {
      "name": "Urban",
      "maxPhotosPerUser": 5,
      "description": "Urban wildlife photography"
    },
    {
      "name": "Landscape",
      "maxPhotosPerUser": 3,
      "description": "Natural landscape photography"
    }
  ]
}

Response:
{
  "id": "comp_123",
  "title": "Wildlife Photography 2024",
  "status": "draft",
  "categories": [
    {
      "id": "cat_1",
      "name": "Urban",
      "maxPhotosPerUser": 5
    }
  ]
}
```

#### Update Competition
```typescript
PUT /api/admin/competitions/:id
Authorization: Bearer <token>

Request:
{
  "title": "Updated Competition Title",
  "description": "Updated description",
  "endDate": "2024-12-31T23:59:59Z"
}

Response:
{
  "id": "comp_123",
  "title": "Updated Competition Title",
  "status": "draft",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### Activate Competition
```typescript
POST /api/admin/competitions/:id/activate
Authorization: Bearer <token>

Response:
{
  "id": "comp_123",
  "status": "active",
  "activatedAt": "2024-01-15T10:00:00Z"
}
```

#### End Competition
```typescript
POST /api/admin/competitions/:id/end
Authorization: Bearer <token>

Response:
{
  "id": "comp_123",
  "status": "ended",
  "endedAt": "2024-12-31T23:59:59Z"
}
```

#### List Competitions
```typescript
GET /api/competitions?status=active&limit=10&offset=0

Response:
{
  "competitions": [
    {
      "id": "comp_123",
      "title": "Wildlife Photography 2024",
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "categories": [...]
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Category Management

#### Add Category to Competition
```typescript
POST /api/admin/competitions/:competitionId/categories
Authorization: Bearer <token>

Request:
{
  "name": "Wildlife Portraits",
  "maxPhotosPerUser": 4,
  "description": "Close-up wildlife photography"
}

Response:
{
  "id": "cat_3",
  "name": "Wildlife Portraits",
  "maxPhotosPerUser": 4,
  "competitionId": "comp_123"
}
```

#### Update Category
```typescript
PUT /api/admin/categories/:id
Authorization: Bearer <token>

Request:
{
  "maxPhotosPerUser": 6,
  "description": "Updated category description"
}
```

#### Delete Category
```typescript
DELETE /api/admin/categories/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Category deleted successfully"
}
```

## Implementation

### 1. Competition Service

#### File: `api/services/competition.service.ts`

```typescript
import { db } from '../database/db';
import { competitions, categories } from '../database/competition-schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id';

export class CompetitionService {
  
  async createCompetition(data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    createdBy: string;
    categories?: Array<{
      name: string;
      maxPhotosPerUser: number;
      description?: string;
    }>;
  }) {
    const competitionId = generateId('comp');
    
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Create competition
    const [competition] = await db.insert(competitions).values({
      id: competitionId,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: data.createdBy,
      status: 'draft',
    }).returning();

    // Create default categories if none provided
    const categoriesToCreate = data.categories?.length ? data.categories : [
      { name: 'Urban', maxPhotosPerUser: 5, description: 'Urban wildlife photography' },
      { name: 'Landscape', maxPhotosPerUser: 5, description: 'Natural landscape photography' }
    ];

    const createdCategories = await Promise.all(
      categoriesToCreate.map(async (cat) => {
        const [category] = await db.insert(categories).values({
          id: generateId('cat'),
          name: cat.name,
          competitionId,
          maxPhotosPerUser: cat.maxPhotosPerUser,
          description: cat.description,
        }).returning();
        return category;
      })
    );

    return {
      ...competition,
      categories: createdCategories,
    };
  }

  async updateCompetition(id: string, updates: Partial<{
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>) {
    // Validate that competition is not active if changing critical fields
    const competition = await this.getCompetitionById(id);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status === 'active' && (updates.startDate || updates.endDate)) {
      throw new Error('Cannot change dates of active competition');
    }

    const [updated] = await db
      .update(competitions)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async activateCompetition(id: string, activatedBy: string) {
    // Check if another competition is already active
    const activeCompetition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .get();

    if (activeCompetition) {
      throw new Error('Another competition is already active');
    }

    // Validate competition can be activated
    const competition = await this.getCompetitionById(id);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'draft') {
      throw new Error('Only draft competitions can be activated');
    }

    const [updated] = await db
      .update(competitions)
      .set({ status: 'active', updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async endCompetition(id: string) {
    const [updated] = await db
      .update(competitions)
      .set({ status: 'ended', updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async getCompetitionById(id: string) {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id))
      .get();

    if (!competition) return null;

    const competitionCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.competitionId, id));

    return {
      ...competition,
      categories: competitionCategories,
    };
  }

  async getActiveCompetition() {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .get();

    if (!competition) return null;

    const competitionCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.competitionId, competition.id));

    return {
      ...competition,
      categories: competitionCategories,
    };
  }

  async listCompetitions(filters: {
    status?: 'draft' | 'active' | 'ended';
    limit?: number;
    offset?: number;
  } = {}) {
    const { status, limit = 10, offset = 0 } = filters;

    let query = db.select().from(competitions);
    
    if (status) {
      query = query.where(eq(competitions.status, status));
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(competitions.createdAt);

    // Get categories for each competition
    const competitionsWithCategories = await Promise.all(
      results.map(async (comp) => {
        const compCategories = await db
          .select()
          .from(categories)
          .where(eq(categories.competitionId, comp.id));
        
        return {
          ...comp,
          categories: compCategories,
        };
      })
    );

    return {
      competitions: competitionsWithCategories,
      total: results.length,
      limit,
      offset,
    };
  }

  // Category management methods
  async addCategory(competitionId: string, categoryData: {
    name: string;
    maxPhotosPerUser: number;
    description?: string;
  }) {
    // Check if category name already exists in competition
    const existing = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.competitionId, competitionId),
        eq(categories.name, categoryData.name)
      ))
      .get();

    if (existing) {
      throw new Error('Category name already exists in this competition');
    }

    const [category] = await db.insert(categories).values({
      id: generateId('cat'),
      competitionId,
      name: categoryData.name,
      maxPhotosPerUser: categoryData.maxPhotosPerUser,
      description: categoryData.description,
    }).returning();

    return category;
  }

  async updateCategory(id: string, updates: Partial<{
    maxPhotosPerUser: number;
    description: string;
  }>) {
    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async deleteCategory(id: string) {
    // TODO: Check if category has photos before deletion
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  }
}
```

### 2. Competition API Routes

#### File: `api/routes/competitions.ts`

```typescript
import { Hono } from 'hono';
import { CompetitionService } from '../services/competition.service';
import { authMiddleware, requireRole } from '../../workers/auth-middleware';

const app = new Hono();
const competitionService = new CompetitionService();

// Public routes
app.get('/competitions', async (c) => {
  const status = c.req.query('status') as 'draft' | 'active' | 'ended' | undefined;
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await competitionService.listCompetitions({ status, limit, offset });
  return c.json(result);
});

app.get('/competitions/:id', async (c) => {
  const { id } = c.req.param();
  const competition = await competitionService.getCompetitionById(id);
  
  if (!competition) {
    return c.json({ error: 'Competition not found' }, 404);
  }

  return c.json(competition);
});

app.get('/competitions/active', async (c) => {
  const competition = await competitionService.getActiveCompetition();
  
  if (!competition) {
    return c.json({ error: 'No active competition' }, 404);
  }

  return c.json(competition);
});

// Admin routes
app.use('/admin/*', authMiddleware, requireRole('admin'));

app.post('/admin/competitions', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  try {
    const competition = await competitionService.createCompetition({
      ...data,
      createdBy: user.id,
    });

    return c.json(competition, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/admin/competitions/:id', async (c) => {
  const { id } = c.req.param();
  const updates = await c.req.json();

  try {
    const competition = await competitionService.updateCompetition(id, updates);
    return c.json(competition);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/admin/competitions/:id/activate', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  try {
    const competition = await competitionService.activateCompetition(id, user.id);
    return c.json(competition);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/admin/competitions/:id/end', async (c) => {
  const { id } = c.req.param();

  try {
    const competition = await competitionService.endCompetition(id);
    return c.json(competition);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Category management
app.post('/admin/competitions/:competitionId/categories', async (c) => {
  const { competitionId } = c.req.param();
  const categoryData = await c.req.json();

  try {
    const category = await competitionService.addCategory(competitionId, categoryData);
    return c.json(category, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/admin/categories/:id', async (c) => {
  const { id } = c.req.param();
  const updates = await c.req.json();

  try {
    const category = await competitionService.updateCategory(id, updates);
    return c.json(category);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/admin/categories/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const result = await competitionService.deleteCategory(id);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

export default app;
```

## Frontend Components

### 1. Competition Form Component

#### File: `app/components/admin/competition-form.tsx`

```typescript
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';

interface CompetitionFormProps {
  competition?: Competition;
  onSubmit: (data: CompetitionFormData) => void;
  loading?: boolean;
}

interface CompetitionFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  categories: Array<{
    name: string;
    maxPhotosPerUser: number;
    description?: string;
  }>;
}

export function CompetitionForm({ competition, onSubmit, loading }: CompetitionFormProps) {
  const [formData, setFormData] = useState<CompetitionFormData>({
    title: competition?.title || '',
    description: competition?.description || '',
    startDate: competition?.startDate || '',
    endDate: competition?.endDate || '',
    categories: competition?.categories || [
      { name: 'Urban', maxPhotosPerUser: 5, description: 'Urban wildlife photography' },
      { name: 'Landscape', maxPhotosPerUser: 5, description: 'Natural landscape photography' }
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, { name: '', maxPhotosPerUser: 5 }],
    }));
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === index ? { ...cat, [field]: value } : cat
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title">Competition Title</label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate">Start Date</label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <label htmlFor="endDate">End Date</label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3>Categories</h3>
          <Button type="button" onClick={addCategory}>Add Category</Button>
        </div>
        
        {formData.categories.map((category, index) => (
          <div key={index} className="border p-4 rounded space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Category name"
                value={category.name}
                onChange={(e) => updateCategory(index, 'name', e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="Max photos"
                value={category.maxPhotosPerUser}
                onChange={(e) => updateCategory(index, 'maxPhotosPerUser', parseInt(e.target.value))}
                min="1"
                required
              />
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => removeCategory(index)}
              >
                Remove
              </Button>
            </div>
            <Input
              placeholder="Category description (optional)"
              value={category.description || ''}
              onChange={(e) => updateCategory(index, 'description', e.target.value)}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : competition ? 'Update Competition' : 'Create Competition'}
      </Button>
    </form>
  );
}
```

## Testing Strategy

### Unit Tests
- Competition creation validation
- Date validation logic
- Category uniqueness checks
- Status transition rules

### Integration Tests
- Competition API endpoints
- Category management flows
- Permission-based access control

### E2E Tests
- Complete competition creation flow
- Admin competition management
- Competition activation/deactivation

## Validation Rules

1. **Date Validation**: End date must be after start date
2. **Unique Active**: Only one active competition at a time
3. **Category Names**: Unique within competition
4. **Status Transitions**: Draft → Active → Ended (no reverse)
5. **Edit Restrictions**: Limited changes once competition is active